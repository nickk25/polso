import { after } from "next/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@polso/db"
import { uploadFile } from "@polso/storage"
import { extractReceiptData } from "@polso/agent/ocr"
import { downloadWhatsAppMedia, sendWhatsAppText } from "@polso/agent/whatsapp"
import { runMatchingForInboxItem } from "@/features/inbox/lib/run-inbox-matching"
import { confirmMatchInDb } from "@polso/inbox"

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
const APP_SECRET = process.env.WHATSAPP_APP_SECRET

// ─── Verification challenge (GET) ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// ─── Incoming messages (POST) ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()

  const valid = await verifySignature(body, req.headers.get("x-hub-signature-256"))
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const message = extractMessage(payload)

  if (!message) {
    // Delivery receipts, status updates, etc. — acknowledge and ignore
    return NextResponse.json({ received: true })
  }

  const { from, messageId, type } = message

  // Resolve phone number → organizationId
  const phone = normalizePhone(from)
  const org = await prisma.organization.findFirst({
    where: { whatsappPhone: phone },
    select: { id: true },
  })

  if (!org) {
    // Check if this is a link code attempt (6-digit number)
    if (type === "text") {
      const text = ((message.raw.text as { body?: string } | undefined)?.body ?? "").trim()
      if (/^\d{6}$/.test(text)) {
        after(handleLinkCode(from, text, "whatsapp"))
      } else {
        await sendWhatsAppText(
          from,
          "Para conectarte a Polso, genera un código en Ajustes › Agente y envíamelo aquí."
        )
      }
    }
    return NextResponse.json({ received: true })
  }

  const organizationId = org.id

  // ── Text: /start, opt-out commands, or unrecognized ────────────────────
  if (type === "text") {
    const text = ((message.raw.text as { body?: string } | undefined)?.body ?? "").trim()
    if (text === "/start") {
      await sendWhatsAppText(
        from,
        "👋 Ya estás conectado a Polso. Envíame una foto o PDF de un recibo para procesarlo."
      )
      return NextResponse.json({ received: true })
    }
    if (text.toLowerCase() === "parar") {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { agentOptOut: true },
      })
      await sendWhatsAppText(
        from,
        "Notificaciones proactivas desactivadas. Puedes seguir enviando recibos. Escribe \"activar\" para reactivarlas."
      )
      return NextResponse.json({ received: true })
    }
    if (text.toLowerCase() === "activar") {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { agentOptOut: false },
      })
      await sendWhatsAppText(from, "Notificaciones proactivas reactivadas. ✓")
      return NextResponse.json({ received: true })
    }
    return NextResponse.json({ received: true })
  }

  // ── Image or document attachment ────────────────────────────────────────
  if (type === "image" || type === "document") {
    const media = message.raw[type] as { id: string; mime_type?: string }

    // Deduplicate — Meta may deliver the same message more than once
    const duplicate = await prisma.inboxItem.findFirst({
      where: { organizationId, waMessageId: messageId },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ received: true })

    // Respond immediately, process in background
    after(
      processReceipt({
        organizationId,
        from,
        messageId,
        mediaId: media.id,
        contentType: media.mime_type ?? "image/jpeg",
        caption:
          (message.raw.image as { caption?: string } | undefined)?.caption ??
          (message.raw.document as { caption?: string; filename?: string } | undefined)?.caption ??
          (message.raw.document as { filename?: string } | undefined)?.filename ??
          null,
      })
    )

    return NextResponse.json({ received: true })
  }

  // ── Interactive button reply (confirm / decline match) ───────────────────
  if (type === "interactive") {
    const replyId =
      (message.raw.interactive as { button_reply?: { id: string } } | undefined)
        ?.button_reply?.id ?? ""

    if (replyId.startsWith("confirm_")) {
      const parts = replyId.split("_")
      const inboxItemId = parts[1]!
      const transactionId = parts[2]!
      after(confirmMatch(organizationId, inboxItemId, transactionId, from))
    } else if (replyId.startsWith("decline_")) {
      const parts = replyId.split("_")
      const inboxItemId = parts[1]!
      const transactionId = parts[2]!
      after(declineMatch(organizationId, inboxItemId, transactionId, from))
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}

// ─── Background: OCR → InboxItem → Matching ─────────────────────────────────

async function processReceipt({
  organizationId,
  from,
  messageId,
  mediaId,
  contentType,
  caption,
}: {
  organizationId: string
  from: string
  messageId: string
  mediaId: string
  contentType: string
  caption: string | null
}): Promise<void> {
  try {
    const { data, contentType: resolvedType } = await downloadWhatsAppMedia(mediaId)

    const ocrData = await extractReceiptData(data, resolvedType)

    if (ocrData.documentType === "other") {
      await sendWhatsAppText(
        from,
        "No he podido identificar este documento como un recibo o factura. Por favor envía una foto más clara o un PDF."
      )
      return
    }

    const ext = resolvedType.includes("pdf") ? "pdf" : (resolvedType.split("/")[1] ?? "jpg")
    const key = `inbox/${organizationId}/${crypto.randomUUID()}.${ext}`
    await uploadFile(key, data, resolvedType)

    const item = await prisma.inboxItem.create({
      data: {
        organizationId,
        fileName:
          caption ??
          `recibo_${new Date().toISOString().split("T")[0]}.${ext}`,
        filePath: key,
        contentType: resolvedType,
        size: data.length,
        displayName: ocrData.displayName,
        amount: ocrData.amount,
        currency: ocrData.currency ?? "EUR",
        date: ocrData.date ? new Date(ocrData.date) : null,
        cif: ocrData.cif,
        taxAmount: ocrData.vatAmount,
        taxRate: ocrData.vatRate,
        status: "processing",
        source: "whatsapp",
        waMessageId: messageId,
        waSenderId: from,
        meta: ocrData as object,
      },
    })

    // Acknowledge receipt with extracted data
    const lines: string[] = ["📄 *Recibo recibido y procesado*\n"]
    if (ocrData.displayName) lines.push(`🏪 Comercio: ${ocrData.displayName}`)
    if (ocrData.amount) lines.push(`💶 Importe: ${ocrData.amount.toFixed(2)} ${ocrData.currency}`)
    if (ocrData.date) lines.push(`📅 Fecha: ${new Date(ocrData.date).toLocaleDateString("es-ES")}`)
    if (ocrData.cif) lines.push(`🏷️ CIF: ${ocrData.cif}`)
    lines.push("\nBuscando transacción coincidente...")

    await sendWhatsAppText(from, lines.join("\n"))

    await runMatchingForInboxItem(organizationId, item.id)
  } catch (err) {
    console.error("[whatsapp/webhook] processReceipt error:", err)
    await sendWhatsAppText(
      from,
      "Ha ocurrido un error procesando tu recibo. Por favor, inténtalo de nuevo."
    ).catch(() => {})
  }
}

// ─── Confirm match ───────────────────────────────────────────────────────────

async function confirmMatch(
  organizationId: string,
  inboxItemId: string,
  transactionId: string,
  from: string
): Promise<void> {
  try {
    const confirmed = await confirmMatchInDb(organizationId, inboxItemId, transactionId)
    if (!confirmed) return
    await sendWhatsAppText(from, "✅ Perfecto, el recibo ha sido vinculado correctamente.")
  } catch (err) {
    console.error("[whatsapp/webhook] confirmMatch error:", err)
  }
}

// ─── Decline match ───────────────────────────────────────────────────────────

async function declineMatch(
  organizationId: string,
  inboxItemId: string,
  transactionId: string,
  from: string
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

    await sendWhatsAppText(
      from,
      "❌ Entendido. El recibo queda guardado sin vincular. Tu asesor lo revisará."
    )
  } catch (err) {
    console.error("[whatsapp/webhook] declineMatch error:", err)
  }
}

// ─── Link code verification ───────────────────────────────────────────────────

async function handleLinkCode(from: string, code: string, channel: "whatsapp"): Promise<void> {
  try {
    const linkCode = await prisma.agentLinkCode.findFirst({
      where: {
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, organizationId: true },
    })

    if (!linkCode) {
      // Generic message — don't reveal whether code exists or which org it belongs to
      await sendWhatsAppText(
        from,
        "Código inválido o expirado. Genera uno nuevo en Ajustes › Agente."
      )
      return
    }

    await prisma.agentLinkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: new Date() },
    })

    // Unlink from any other org that already uses this phone (reconect scenario)
    await prisma.organization.updateMany({
      where: {
        whatsappPhone: normalizePhone(from),
        NOT: { id: linkCode.organizationId },
      },
      data: { whatsappPhone: null },
    })

    await prisma.organization.update({
      where: { id: linkCode.organizationId },
      data: { whatsappPhone: normalizePhone(from) },
    })

    await sendWhatsAppText(
      from,
      "✅ ¡Conectado! Ya puedes enviarme fotos o PDFs de recibos y facturas para procesarlos."
    )
  } catch (err) {
    console.error(`[whatsapp/webhook] handleLinkCode error:`, err)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ParsedMessage {
  from: string
  messageId: string
  type: string
  raw: Record<string, unknown>
}

function extractMessage(payload: unknown): ParsedMessage | null {
  try {
    const p = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from: string
              id: string
              type: string
              [key: string]: unknown
            }>
          }
        }>
      }>
    }

    const message = p?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!message) return null

    return {
      from: message.from,
      messageId: message.id,
      type: message.type,
      raw: message as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

/** Normalize WhatsApp phone number to E.164 (+34...) */
function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`
}

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) {
    // Allow in development without a configured secret
    return true
  }
  if (!signature) return false

  // Meta sends "sha256=<hex>"
  const [algo, hash] = signature.split("=")
  if (algo !== "sha256" || !hash) return false

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
    const expected = Buffer.from(sig).toString("hex")

    // Timing-safe comparison
    if (expected.length !== hash.length) return false
    let mismatch = 0
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ hash.charCodeAt(i)
    }
    return mismatch === 0
  } catch {
    return false
  }
}
