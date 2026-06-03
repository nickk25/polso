# packages/inbox — @polso/inbox

Canonical receipt processing and match persistence for all upload paths. Every route that accepts a receipt — web vault, partner upload, Telegram, WhatsApp — must go through this package. Logic here propagates to all callers automatically.

## What it exports

```typescript
// Match persistence — auto-match path (cron sync or upload)
persistMatchResult(organizationId, tx, inboxItem, scores, matchType)
// Creates/upserts MatchSuggestion. If auto_matched: links transactionAttachment,
// marks inboxItem "done", marks entry "verified", propagates IVA. Sends channel
// notification if waSenderId or tgChatId is present.

// Match persistence — manual confirm path (user presses ✅ button)
confirmMatchInDb(organizationId, inboxItemId, transactionId) → Promise<boolean>
// Verifies org ownership, propagates IVA, runs $transaction. Returns false if
// no suggestion found (safe no-op for stale callbacks). Entry guard: only updates
// entries where status ≠ "verified".

// Single-item matching pipeline
runMatchingForItem(organizationId, inboxItemId)
// Fetches inboxItem + open transactions (last 90 days, amount > 0, no attachment),
// calls findBestMatches, calls persistMatchResult. Sends "saved for later"
// notification when no match exists.

// Full OCR + matching pipeline for upload flows
processInboxItem(organizationId, inboxItemId, buffer, contentType)
// extractReceiptData → update inboxItem fields → runMatchingForItem.
// On error: sets status "no_match" silently.

// Types
TxForMatch, InboxItemForMatch, MatchScoresResult
```

## Match paths — who calls what

| Trigger | Entry point |
|---------|-------------|
| Web vault upload | `processInboxItem` |
| Partner upload | `processInboxItem` |
| Telegram file upload | `processInboxItem` |
| WhatsApp media upload | `processInboxItem` |
| GoCardless cron sync | `persistMatchResult` (via `match-after-sync.ts`) |
| Telegram ✅ button | `confirmMatchInDb` |
| WhatsApp ✅ button | `confirmMatchInDb` |

Web UI confirm (`confirmMatchAction`, `manualMatchAction`) and partner confirm (`confirmSuggestionAction`, `bulkConfirmSuggestionsAction`) have their own DB logic because they look up by suggestion ID and carry `userActionBy`. They must stay in sync with `confirmMatchInDb` manually — see below.

## IVA propagation rule

On any confirmed match, `taxAmount` and `taxRate` are copied from InboxItem to Entry **only when the entry field is currently null** (never overwrite existing data). Always applied as a spread on `entry.updateMany` with `status: { not: "verified" }` guard to avoid double-marking.

```typescript
const taxData: { taxAmount?: number; taxRate?: number } = {}
if (inboxItem.taxAmount != null && existingEntry?.taxAmount == null) taxData.taxAmount = inboxItem.taxAmount
if (inboxItem.taxRate != null && existingEntry?.taxRate == null) taxData.taxRate = inboxItem.taxRate

prisma.entry.updateMany({
  where: { transactionId, organizationId, status: { not: "verified" } },
  data: { status: "verified", ...taxData },
})
```

**If you change IVA logic here, apply the same change to:**
- `apps/web/features/inbox/actions/vault-actions.ts` — `confirmMatchAction`, `manualMatchAction`
- `apps/partner/features/matching/actions/handle-suggestion.ts` — `confirmSuggestionInternal`
- `apps/partner/features/matching/actions/bulk-confirm-suggestions.ts` — `confirmOne`

## Notification channels

`persistMatchResult` and `runMatchingForItem` send channel notifications only when the InboxItem has `waSenderId` (WhatsApp) or `tgChatId` (Telegram). Upload flows from web/partner never have these fields set — notifications are a no-op there.

Notification helpers are imported from `@polso/agent/whatsapp` and `@polso/agent/telegram`.

## Dependencies

- `@polso/db` — Prisma client
- `@polso/agent/ocr` — `extractReceiptData`
- `@polso/agent/whatsapp` — notification helpers
- `@polso/agent/telegram` — notification helpers
- `@polso/matching` — `findBestMatches`
