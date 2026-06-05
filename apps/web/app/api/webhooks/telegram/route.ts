import { createHash } from "node:crypto"
import { after } from "next/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@polso/db"
import { uploadFile } from "@polso/storage"
import { extractReceiptData } from "@polso/agent/ocr"
import {
  sendTelegramText,
  sendTelegramMatchNotification,
  answerCallbackQuery,
  downloadTelegramFile,
} from "@polso/agent/telegram"
import { runMatchingForInboxItem } from "@/features/inbox/lib/run-inbox-matching"
import { confirmMatchInDb } from "@polso/inbox"

const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim()

// ─── Incoming updates (POST) ─────────────────────────────────────────────────
// Telegram only uses POST. Verification is via X-Telegram-Bot-Api-Secret-Token header.

export async function POST(req: NextRequest) {
  // Verify that the request comes from Telegram
  const incomingToken = req.headers.get("x-telegram-bot-api-secret-token")

if (SECRET_TOKEN && incomingToken !== SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const update = (await req.json()) as TelegramUpdate

  // ── Callback query (inline button press: confirm/decline) ─────────────────
  if (update.callback_query) {
    const { id: callbackId, from, data: callbackData, message } = update.callback_query
    const chatId = String(message?.chat.id ?? from.id)

    // ACK the button press immediately — removes Telegram's loading spinner
    after(answerCallbackQuery(callbackId))

    if (callbackData?.startsWith("confirm_") || callbackData?.startsWith("decline_")) {
      const membership = await prisma.userOrganization.findFirst({
        where: { telegramChatId: chatId },
        select: { organizationId: true },
      })
      if (!membership) return NextResponse.json({ ok: true })
      const org = { id: membership.organizationId }

      const parts = callbackData.split("_")
      const action = parts[0]! // "confirm" | "decline"
      const inboxItemId = parts[1]!
      const transactionId = parts[2]!

      if (action === "confirm") {
        after(confirmMatch(org.id, inboxItemId, transactionId, chatId))
      } else {
        after(declineMatch(org.id, inboxItemId, transactionId, chatId))
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ── Regular message ───────────────────────────────────────────────────────
  const message = update.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId = String(message.chat.id)
  const messageId = message.message_id

  // Resolve chat ID → organization via per-user membership
  const membership = await prisma.userOrganization.findFirst({
    where: { telegramChatId: chatId },
    select: { organizationId: true },
  })

  if (!membership) {
    // Check if this is a link code attempt (6-digit number)
    if (message.text) {
      const text = message.text.trim()
      if (/^\d{6}$/.test(text)) {
        after(handleLinkCode(chatId, text))
      } else if (text === "/start") {
        await sendTelegramText(
          chatId,
          "Para conectarte a Polso, genera un código en Ajustes › Agente y envíamelo aquí."
        )
      } else {
        await sendTelegramText(
          chatId,
          "Para conectarte a Polso, genera un código en Ajustes › Agente y envíamelo aquí."
        )
      }
    }
    return NextResponse.json({ ok: true })
  }

  const organizationId = membership.organizationId

  // ── Text: /start, opt-out commands, or unrecognized ────────────────────
  if (message.text) {
    const text = message.text.trim()
    if (text === "/start") {
      await sendTelegramText(
        chatId,
        "👋 Ya estás conectado a Polso. Envíame una foto o PDF de un recibo para procesarlo."
      )
      return NextResponse.json({ ok: true })
    }
    if (text.toLowerCase() === "parar") {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { agentOptOut: true },
      })
      await sendTelegramText(
        chatId,
        "Notificaciones proactivas desactivadas. Puedes seguir enviando recibos. Escribe \"activar\" para reactivarlas."
      )
      return NextResponse.json({ ok: true })
    }
    if (text.toLowerCase() === "activar") {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { agentOptOut: false },
      })
      await sendTelegramText(chatId, "Notificaciones proactivas reactivadas. ✓")
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: true })
  }

  // ── Photo ─────────────────────────────────────────────────────────────────
  if (message.photo) {
    // Telegram sends multiple sizes — pick the largest (last in array)
    const largest = message.photo[message.photo.length - 1]!
    const dedupKey = `${chatId}_${messageId}`

    const duplicate = await prisma.inboxItem.findFirst({
      where: { organizationId, tgMessageId: dedupKey },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ ok: true })

    after(
      processReceipt({
        organizationId,
        chatId,
        dedupKey,
        fileId: largest.file_id,
        caption: message.caption ?? null,
      })
    )

    return NextResponse.json({ ok: true })
  }

  // ── Document (PDF or image file) ──────────────────────────────────────────
  if (message.document) {
    const { file_id, mime_type, file_name } = message.document
    const supportedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]

    if (!mime_type || !supportedMimes.includes(mime_type)) {
      await sendTelegramText(
        chatId,
        "Este tipo de archivo no está soportado. Para guardar un recibo envíame una foto del ticket, una imagen (JPG, PNG) o un PDF de la factura."
      )
      return NextResponse.json({ ok: true })
    }

    const dedupKey = `${chatId}_${messageId}`
    const duplicate = await prisma.inboxItem.findFirst({
      where: { organizationId, tgMessageId: dedupKey },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ ok: true })

    after(
      processReceipt({
        organizationId,
        chatId,
        dedupKey,
        fileId: file_id,
        caption: message.caption ?? file_name ?? null,
      })
    )

    return NextResponse.json({ ok: true })
  }

  // Specific messages for common unsupported types
  if (message.video || message.video_note || message.animation) {
    await sendTelegramText(
      chatId,
      "Los vídeos no se pueden procesar. Para guardar un recibo, envíame una foto del ticket o el PDF de la factura."
    )
    return NextResponse.json({ ok: true })
  }

  if (message.voice || message.audio) {
    await sendTelegramText(
      chatId,
      "Los audios no se pueden procesar. Para guardar un recibo, envíame una foto del ticket o el PDF de la factura."
    )
    return NextResponse.json({ ok: true })
  }

  if (message.sticker) {
    await sendTelegramText(
      chatId,
      "Para guardar un recibo, envíame una foto del ticket o el PDF de la factura."
    )
    return NextResponse.json({ ok: true })
  }

  // Catch-all: text without a command, or any other message type
  if (message.text) {
    return NextResponse.json({ ok: true })
  }

  await sendTelegramText(
    chatId,
    "Para guardar un recibo, envíame una foto del ticket o el PDF de la factura."
  )

  return NextResponse.json({ ok: true })
}

// ─── Background: OCR → InboxItem → Matching ─────────────────────────────────

async function processReceipt({
  organizationId,
  chatId,
  dedupKey,
  fileId,
  caption,
}: {
  organizationId: string
  chatId: string
  dedupKey: string
  fileId: string
  caption: string | null
}): Promise<void> {
  try {
    const { data, contentType } = await downloadTelegramFile(fileId)

    // Dedup by file hash — same PDF sent again re-runs matching on the existing item
    const fileHash = createHash("sha256").update(data).digest("hex")

    const existing = await prisma.inboxItem.findFirst({
      where: { organizationId, fileHash },
      select: { id: true, status: true },
    })

    if (existing) {
      await sendTelegramText(
        chatId,
        "📂 Ya tengo este documento guardado. Buscando transacción coincidente..."
      )
      await runMatchingForInboxItem(organizationId, existing.id)
      return
    }

    const ocrData = await extractReceiptData(data, contentType)

    if (ocrData.documentType === "other") {
      await sendTelegramText(
        chatId,
        "No he podido identificar este documento como un recibo o factura. Por favor envía una foto más clara o un PDF."
      )
      return
    }

    const ext = contentType.includes("pdf") ? "pdf" : (contentType.split("/")[1] ?? "jpg")
    const key = `inbox/${organizationId}/${crypto.randomUUID()}.${ext}`
    await uploadFile(key, data, contentType)

    const item = await prisma.inboxItem.create({
      data: {
        organizationId,
        fileName: caption ?? `recibo_${new Date().toISOString().split("T")[0]}.${ext}`,
        filePath: key,
        contentType,
        size: data.length,
        displayName: ocrData.displayName,
        amount: ocrData.amount,
        currency: ocrData.currency ?? "EUR",
        date: ocrData.date ? new Date(ocrData.date) : null,
        cif: ocrData.cif,
        taxAmount: ocrData.vatAmount,
        taxRate: ocrData.vatRate,
        status: "processing",
        source: "telegram",
        tgMessageId: dedupKey,
        tgChatId: chatId,
        fileHash,
        meta: ocrData as object,
      },
    })

    // Acknowledge with extracted data
    const lines: string[] = ["📄 *Recibo recibido y procesado*\n"]
    if (ocrData.displayName) lines.push(`🏪 Comercio: ${ocrData.displayName}`)
    if (ocrData.amount) lines.push(`💶 Importe: ${ocrData.amount.toFixed(2)} ${ocrData.currency}`)
    if (ocrData.date) lines.push(`📅 Fecha: ${new Date(ocrData.date).toLocaleDateString("es-ES")}`)
    if (ocrData.cif) lines.push(`🏷️ CIF: ${ocrData.cif}`)
    lines.push("\nBuscando transacción coincidente...")

    await sendTelegramText(chatId, lines.join("\n"))

    await runMatchingForInboxItem(organizationId, item.id)
  } catch (err) {
    console.error("[telegram/webhook] processReceipt error:", err)
    const errMsg = err instanceof Error ? err.message : ""
    const isImageQuality =
      errMsg.includes("UnsupportedFunctionality") ||
      errMsg.includes("image") ||
      errMsg.includes("file")
    await sendTelegramText(
      chatId,
      isImageQuality
        ? "No he podido leer el documento. Intenta enviarlo como PDF, o toma la foto con más luz y asegúrate de que el texto sea legible."
        : "Ha habido un problema guardando el recibo. Por favor, inténtalo de nuevo en unos segundos."
    ).catch(() => {})
  }
}

// ─── Link code verification ───────────────────────────────────────────────────

async function handleLinkCode(chatId: string, code: string): Promise<void> {
  try {
    const linkCode = await prisma.agentLinkCode.findFirst({
      where: {
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!linkCode) {
      // Generic message — don't reveal whether code exists or which org it belongs to
      await sendTelegramText(
        chatId,
        "Código inválido o expirado. Genera uno nuevo en Ajustes › Agente."
      )
      return
    }

    await prisma.agentLinkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: new Date() },
    })

    // Unlink this chat ID from any other membership (reconnect scenario)
    await prisma.userOrganization.updateMany({
      where: {
        telegramChatId: chatId,
        NOT: { userId: linkCode.userId },
      },
      data: { telegramChatId: null },
    })

    await prisma.userOrganization.updateMany({
      where: { userId: linkCode.userId, organizationId: linkCode.organizationId },
      data: { telegramChatId: chatId },
    })

    await sendTelegramText(
      chatId,
      "✅ ¡Conectado! Ya puedes enviarme fotos o PDFs de recibos y facturas para procesarlos."
    )
  } catch (err) {
    console.error(`[telegram/webhook] handleLinkCode error:`, err)
  }
}

// ─── Confirm match ────────────────────────────────────────────────────────────

async function confirmMatch(
  organizationId: string,
  inboxItemId: string,
  transactionId: string,
  chatId: string
): Promise<void> {
  try {
    const confirmed = await confirmMatchInDb(organizationId, inboxItemId, transactionId)
    if (!confirmed) return
    await sendTelegramText(chatId, "✅ Perfecto, el recibo ha sido vinculado correctamente.")
  } catch (err) {
    console.error("[telegram/webhook] confirmMatch error:", err)
  }
}

// ─── Decline match ────────────────────────────────────────────────────────────

async function declineMatch(
  organizationId: string,
  inboxItemId: string,
  transactionId: string,
  chatId: string
): Promise<void> {
  try {
    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { organizationId, inboxItemId, transactionId },
      select: { id: true },
    })
    if (!suggestion) return

    await prisma.matchSuggestion.updateMany({
      where: { inboxItemId, transactionId },
      data: { status: "declined", userActionAt: new Date() },
    })
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    })

    await sendTelegramText(
      chatId,
      "❌ Entendido. El recibo queda guardado sin vincular. Tu asesor lo revisará."
    )
  } catch (err) {
    console.error("[telegram/webhook] declineMatch error:", err)
  }
}

// ─── Telegram Update types (minimal) ─────────────────────────────────────────

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: TelegramChat
  text?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  video?: { file_id: string }
  video_note?: { file_id: string }
  animation?: { file_id: string }
  voice?: { file_id: string }
  audio?: { file_id: string }
  sticker?: { file_id: string }
  caption?: string
}

interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: { chat: TelegramChat; message_id: number }
  data?: string
}

interface TelegramUser {
  id: number
  first_name: string
}

interface TelegramChat {
  id: number
}

interface TelegramPhotoSize {
  file_id: string
  width: number
  height: number
  file_size?: number
}

interface TelegramDocument {
  file_id: string
  file_name?: string
  mime_type?: string
}
