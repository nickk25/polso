# packages/agent — @polso/agent

WhatsApp + OCR infrastructure for the Polso AI agent.

## What it exports

```typescript
// OCR
extractReceiptData(fileData, contentType)  // → ReceiptData — Claude Haiku extraction
ReceiptSchema    // Zod schema — Spanish CIF, IVA rates, receipt vs invoice
ReceiptData      // z.infer<typeof ReceiptSchema>

// WhatsApp Cloud API
sendWhatsAppText(to, text)                 // plain text message
sendMatchNotification(params)              // interactive button message (confirm/decline)
downloadWhatsAppMedia(mediaId)             // → { data: Buffer, contentType: string }
MatchNotificationParams                    // type

// Telegram Bot API
sendTelegramText(chatId, text)                    // plain text (Markdown supported)
sendTelegramMatchNotification(params)             // inline keyboard (confirm/decline)
downloadTelegramFile(fileId)                      // → { data: Buffer, contentType: string }
answerCallbackQuery(callbackQueryId, text?)       // ACK inline button press
TelegramMatchNotificationParams                   // type
```

## Environment variables

```env
ANTHROPIC_API_KEY                # Anthropic API key — read automatically by @ai-sdk/anthropic
WHATSAPP_ACCESS_TOKEN            # Meta permanent token (System User token)
WHATSAPP_PHONE_NUMBER_ID         # WhatsApp Business phone number ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN    # Token for Meta webhook verification challenge
WHATSAPP_APP_SECRET              # HMAC secret for validating incoming webhook signatures
TELEGRAM_BOT_TOKEN               # Bot token from @BotFather
TELEGRAM_WEBHOOK_SECRET_TOKEN    # Secret sent in X-Telegram-Bot-Api-Secret-Token header
```

## OCR notes

- Model: `claude-haiku-4-5-20251001` via Vercel AI SDK `generateObject()`
- Accepts both images (JPEG, PNG, WebP) and PDFs via the `file` content part
- Spanish-specific: CIF/NIF tax ID, IVA rates (21%/10%/4%), receipt vs factura distinction
- Returns `documentType: "other"` for unrecognizable documents — caller should reject these

## WhatsApp notes

- Button reply IDs encode the action: `confirm_{inboxItemId}_{transactionId}` or `decline_{...}`
- Media download requires two requests: (1) resolve CDN URL from media ID, (2) download from lookaside.fbsbx.com
- All requests use v21.0 of the Graph API

## Dependencies

- `ai` (Vercel AI SDK), `@ai-sdk/anthropic`, `zod`
- No `@polso/*` dependencies — this is pure infrastructure, no DB access
