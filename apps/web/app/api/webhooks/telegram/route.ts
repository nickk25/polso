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

const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN

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
      const org = await prisma.organization.findFirst({
        where: { telegramChatId: chatId },
        select: { id: true },
      })
      if (!org) return NextResponse.json({ ok: true })

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

  // Resolve chat ID → organization
  const org = await prisma.organization.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true },
  })

  if (!org) {
    await sendTelegramText(
      chatId,
      "Hola 👋 Tu cuenta no está registrada en Polso. Contacta con tu asesor para activar el agente."
    )
    return NextResponse.json({ ok: true })
  }

  const organizationId = org.id

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
        "Solo puedo procesar imágenes (JPG, PNG, WebP) y PDFs. Por favor envía el recibo en uno de esos formatos."
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

  // Unsupported message type (text, sticker, etc.)
  await sendTelegramText(
    chatId,
    "Para registrar un recibo, envíame una foto o un PDF del documento."
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
        status: "processing",
        source: "telegram",
        tgMessageId: dedupKey,
        tgChatId: chatId,
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
    await sendTelegramText(
      chatId,
      "Ha ocurrido un error procesando tu recibo. Por favor, inténtalo de nuevo."
    ).catch(() => {})
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
    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { organizationId, inboxItemId, transactionId },
      select: { id: true },
    })
    if (!suggestion) return

    await prisma.$transaction([
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
        update: {},
        create: { transactionId, inboxItemId },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId },
      }),
      prisma.matchSuggestion.updateMany({
        where: { inboxItemId, transactionId },
        data: { status: "confirmed", userActionAt: new Date() },
      }),
    ])

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
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
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
