const BASE_URL = "https://graph.facebook.com/v21.0"

function creds() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  }
}

/**
 * Send a plain text message via WhatsApp Cloud API.
 */
export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const { phoneNumberId, accessToken } = creds()
  await post(`${phoneNumberId}/messages`, accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  })
}

export interface MatchNotificationParams {
  to: string
  inboxItemId: string
  transactionId: string
  receiptName: string | null
  transactionName: string | null
  amount: number
  currency: string
  date: Date
  confidence: number
}

/**
 * Send an interactive button message asking the user to confirm/decline a match.
 * Button reply IDs encode: confirm_{inboxItemId}_{transactionId} or decline_{...}
 */
export async function sendMatchNotification({
  to,
  inboxItemId,
  transactionId,
  receiptName,
  transactionName,
  amount,
  currency,
  date,
  confidence,
}: MatchNotificationParams): Promise<void> {
  const { phoneNumberId, accessToken } = creds()

  const formattedAmount = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(Math.abs(amount))

  const pct = Math.round(confidence * 100)

  await post(`${phoneNumberId}/messages`, accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `🔍 *Posible coincidencia encontrada* (${pct}% seguridad)\n\n📄 Recibo: ${receiptName ?? "Sin nombre"}\n💳 Transacción: ${transactionName ?? "Sin nombre"}\n💶 Importe: ${formattedAmount}\n📅 Fecha: ${date.toLocaleDateString("es-ES")}\n\n¿Es correcto?`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `confirm_${inboxItemId}_${transactionId}`,
              title: "✅ Sí, correcto",
            },
          },
          {
            type: "reply",
            reply: {
              id: `decline_${inboxItemId}_${transactionId}`,
              title: "❌ No es correcto",
            },
          },
        ],
      },
    },
  })
}

/**
 * Download media from WhatsApp Cloud API.
 * Step 1: Resolve the CDN URL from the media ID.
 * Step 2: Download bytes from lookaside.fbsbx.com using the bearer token.
 */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ data: Buffer; contentType: string }> {
  const { accessToken } = creds()

  const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!metaRes.ok) {
    throw new Error(`WhatsApp media lookup failed: ${metaRes.status}`)
  }

  const { url, mime_type } = (await metaRes.json()) as {
    url: string
    mime_type: string
  }

  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!mediaRes.ok) {
    throw new Error(`WhatsApp media download failed: ${mediaRes.status}`)
  }

  const data = Buffer.from(await mediaRes.arrayBuffer())
  return { data, contentType: mime_type }
}

async function post(path: string, token: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API /${path} failed: ${res.status} — ${err}`)
  }

  return res.json()
}
