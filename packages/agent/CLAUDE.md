# packages/agent — @polso/agent

WhatsApp + Telegram + OCR + proactive messaging infrastructure for the Polso AI agent.

## What it exports

```typescript
// OCR
extractReceiptData(fileData, contentType)  // → ReceiptData — Claude Haiku extraction
ReceiptSchema    // Zod schema — Spanish CIF, IVA rates, receipt vs invoice
ReceiptData      // z.infer<typeof ReceiptSchema>
FileTooLargeError // thrown when file exceeds limits (images 5MB, PDFs 25MB)

// WhatsApp Cloud API
sendWhatsAppText(to, text)                 // plain text message
sendMatchNotification(params)              // interactive button message (confirm/decline)
downloadWhatsAppMedia(mediaId)             // → { data: Buffer, contentType: string }
MatchNotificationParams                    // type

// Telegram Bot API
sendTelegramText(chatId, text)                    // plain text (Markdown supported)
sendTelegramMatchNotification(params)             // inline keyboard (confirm/decline)
sendTelegramTypingAction(chatId)                  // "typing…" chat action while processing
downloadTelegramFile(fileId)                      // → { data: Buffer, contentType: string }
answerCallbackQuery(callbackQueryId, text?)       // ACK inline button press
TelegramMatchNotificationParams                   // type

// Proactive messaging
generateProactiveMessage(context)  // → string — Claude Haiku, Spanish, ≤400 chars
ProactiveContext                   // type — orgName + messageType + per-type payload
MessageType                        // "receipt_reminder" | "weekly_summary" | "monthly_summary"
                                   // | "anomaly_alert" | "receipt_request_list" | "bank_reconnect"
```

## Environment variables

```env
ANTHROPIC_API_KEY_OCR            # Anthropic API key for OCR and proactive agent
WHATSAPP_ACCESS_TOKEN            # Meta permanent token (System User token)
WHATSAPP_PHONE_NUMBER_ID         # WhatsApp Business phone number ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN    # Token for Meta webhook verification challenge
WHATSAPP_APP_SECRET              # HMAC secret for validating incoming webhook signatures
TELEGRAM_BOT_TOKEN               # Bot token from @BotFather
TELEGRAM_WEBHOOK_SECRET_TOKEN    # Secret sent in X-Telegram-Bot-Api-Secret-Token header
```

This package itself only reads `ANTHROPIC_API_KEY_OCR`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `TELEGRAM_BOT_TOKEN` — the webhook vars are consumed by the webhook routes in `apps/web/app/api/webhooks/`. Missing WhatsApp/Telegram credentials throw a clear error at call time (not import time).

## OCR notes

- Model: `claude-haiku-4-5-20251001` via Vercel AI SDK `generateObject()`
- Accepts images (JPEG, PNG, WebP, GIF) via the `image` content part and PDFs via the `file` content part
- Spanish-specific: CIF/NIF tax ID, IVA rates (21%/10%/4%), receipt vs factura distinction
- Returns `documentType: "other"` for unrecognizable documents — caller should reject these

## WhatsApp notes

- Button reply IDs encode the action: `confirm_{inboxItemId}_{transactionId}` or `decline_{...}`
- Media download requires two requests: (1) resolve CDN URL from media ID, (2) download from lookaside.fbsbx.com
- All requests use v21.0 of the Graph API

## Dependencies

- `ai` (Vercel AI SDK), `@ai-sdk/anthropic`, `zod`
- No `@polso/*` dependencies — this is pure infrastructure, no DB access
