const BASE_URL = "https://api.telegram.org"

function token() {
  return process.env.TELEGRAM_BOT_TOKEN!
}

function apiUrl(method: string) {
  return `${BASE_URL}/bot${token()}/${method}`
}

// ─── Send messages ──────────────────────────────────────────────────────────

/**
 * Send a plain text message. Supports MarkdownV2 formatting.
 */
export async function sendTelegramText(
  chatId: string | number,
  text: string
): Promise<void> {
  await tgPost("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  })
}

export interface TelegramMatchNotificationParams {
  chatId: string | number
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
 * Send an inline keyboard message asking the user to confirm or decline a match.
 * Callback data encodes: confirm_{inboxItemId}_{transactionId} or decline_{...}
 */
// Escape characters special in Telegram Markdown v1 that appear in user content
function escapeMd(text: string): string {
  return text.replace(/[_*[\]`]/g, "\\$&")
}

export async function sendTelegramMatchNotification({
  chatId,
  inboxItemId,
  transactionId,
  receiptName,
  transactionName,
  amount,
  currency,
  date,
  confidence,
}: TelegramMatchNotificationParams): Promise<void> {
  const formattedAmount = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(Math.abs(amount))

  const pct = Math.round(confidence * 100)

  await tgPost("sendMessage", {
    chat_id: chatId,
    parse_mode: "Markdown",
    text: [
      `🔍 *Posible coincidencia encontrada* (${pct}% seguridad)`,
      "",
      `📄 Recibo: ${escapeMd(receiptName ?? "Sin nombre")}`,
      `💳 Transacción: ${escapeMd(transactionName ?? "Sin nombre")}`,
      `💶 Importe: ${formattedAmount}`,
      `📅 Fecha: ${date.toLocaleDateString("es-ES")}`,
      "",
      "¿Es correcto?",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Sí, correcto",
            callback_data: `confirm_${inboxItemId}_${transactionId}`,
          },
          {
            text: "❌ No es correcto",
            callback_data: `decline_${inboxItemId}_${transactionId}`,
          },
        ],
      ],
    },
  })
}

/**
 * Send a typing indicator to show the bot is processing.
 */
export async function sendTelegramTypingAction(chatId: string | number): Promise<void> {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  })
}

/**
 * Answer a callback query to remove the loading spinner on the button.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await tgPost("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  })
}

// ─── Download media ──────────────────────────────────────────────────────────

/**
 * Download a file from Telegram.
 * Telegram requires two steps: getFile (resolve path) → download.
 */
export async function downloadTelegramFile(
  fileId: string
): Promise<{ data: Buffer; contentType: string }> {
  // Step 1: resolve file_path
  const fileRes = await tgPost<{ result: { file_path: string } }>("getFile", {
    file_id: fileId,
  })
  const filePath = fileRes.result.file_path

  // Step 2: download from CDN
  const url = `${BASE_URL}/file/bot${token()}/${filePath}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Telegram file download failed: ${res.status}`)
  }

  const data = Buffer.from(await res.arrayBuffer())

  // Infer content type from extension
  const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
  const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream"

  return { data, contentType }
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function tgPost<T = unknown>(method: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API /${method} failed: ${res.status} — ${err}`)
  }

  const json = (await res.json()) as { ok: boolean; description?: string } & T
  if (!json.ok) {
    throw new Error(`Telegram API /${method} error: ${json.description}`)
  }

  return json
}
