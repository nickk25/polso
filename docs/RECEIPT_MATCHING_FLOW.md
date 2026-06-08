# Receipt Matching Flow

How Polso handles the lifecycle of an uploaded receipt — including what happens when no transaction exists yet.

---

## Receipt sources

| Source | Entry point | `source` field |
|--------|------------|----------------|
| Web vault upload | `POST /api/vault/upload` | `"upload"` |
| Chat attachment | `POST /api/chat` (multipart) | `"chat"` |
| Telegram bot | `POST /api/webhooks/telegram` | `"telegram"` |
| WhatsApp bot | `POST /api/webhooks/whatsapp` | `"whatsapp"` |
| Partner bulk upload | `apps/partner` upload action | `"upload"` |

The **chat path** pre-processes attachments with Haiku OCR *before* streaming Sonnet, so the language model only receives structured JSON — never the image binary. Sonnet acknowledges the result and the user sees a summary in the conversation.

---

## Happy path (transaction already exists)

```
User uploads receipt (web / partner / WhatsApp / Telegram / chat)
  → R2 storage
  → InboxItem created  status: "processing"
  → processInboxItem()
      → extractReceiptData()   (Claude Haiku OCR)
        → amount, date, displayName, cif, taxAmount, taxRate
      → runMatchingForItem()
          → fetch ALL open transactions (amount > 0, no attachment, no date filter)
          → findBestMatches()  (packages/matching)
          → persistMatchResult()
              ≥ 0.95 → auto_matched  → InboxItem "done",  TransactionAttachment created,
                                        Entry "verified",  IVA propagated,  channel notif
              ≥ 0.75 → high_confidence → InboxItem "suggested_match", MatchSuggestion "pending", notif
              ≥ 0.50 → suggested       → same as above
```

---

## Document uploaded before the transaction exists

```
Same upload path as above
  → runMatchingForItem()
      → zero transactions found, OR best score < 0.50
      → InboxItem status: "no_match"
      → channel notification: "Tu recibo ha sido guardado.
        Cuando llegue la transacción del banco lo vincularemos automáticamente."
```

The InboxItem sits in `no_match` indefinitely. **No timer, no scheduled retry.**

---

## Deferred reconciliation — triggered by bank sync

When GoCardless sync imports new transactions, `syncTransactionsCore()` calls `matchAfterSync()`:

**File:** `apps/web/features/inbox/lib/match-after-sync.ts`

```
matchAfterSync(organizationId, newTransactionIds)
  → fetch all InboxItems where status IN ["processing", "no_match", "suggested_match"]
  → Phase 1: for each new transaction → find best available InboxItem
  → Phase 2: for remaining unmatched InboxItems → find best remaining transaction
  (in-memory claim sets prevent duplicate assignments)
  → each matched pair → persistMatchResult()
```

This is the only automatic retry path. It covers:
- Receipts uploaded when no transactions existed yet (`no_match`)
- Receipts stuck in `processing` (OCR slow or failed gracefully)
- Prior `suggested_match` items (can be superseded by a better transaction)

---

## Manual retry paths

| Who | Action | Entry point |
|-----|--------|-------------|
| Client (web) | Confirms a suggestion | `confirmMatchAction()` in `vault-actions.ts` |
| Client (bot) | Taps ✅ in WhatsApp/Telegram | `confirmMatchInDb()` in `@polso/inbox` |
| Partner | Triggers matching manually | `runMatchingAction(clientId)` in partner matching actions |
| Partner | Bulk-confirms suggestions | `bulkConfirmSuggestionsAction()` |

---

## InboxItem status state machine

```
new
 └─ processing       (OCR in flight)
     ├─ ocr_failed   (Haiku threw or returned "other"; file saved, re-OCR on next retry)
     ├─ no_match     (no transaction candidate above threshold)
     │    └─ → suggested_match or done  (when matchAfterSync fires or manual re-run)
     ├─ suggested_match (awaiting user confirmation)
     │    ├─ done       (confirmed)
     │    └─ no_match   (user rejected, or superseded with better match)
     └─ done            (auto_matched or user confirmed)

Any state → archived  (user manually archives)
```

**`ocr_failed`** is set when `extractReceiptData()` throws or returns `documentType: "other"`. The file is already on R2. The partner daily cron (`recoverStuckInboxItems`) re-attempts OCR automatically within 15 min.

---

## Scoring weights & thresholds

| Signal | Weight | Notes |
|--------|--------|-------|
| amount | 30% | IVA-aware: tries 21%, 10%, 4% gross→net variants |
| date | 15% | Same-day = 1.0; linear decay to 0.0 at 90 days |
| name | 10% | Exact CIF match → 1.0; else Jaccard token similarity |
| currency | 5% | EUR/EUR → 1.0; mismatch → 0.3 |

| Type | Threshold | Action |
|------|-----------|--------|
| `auto_matched` | ≥ 0.95 | Confirm silently, no user review |
| `high_confidence` | ≥ 0.75 | Show with strong indicator, send interactive notification |
| `suggested` | ≥ 0.50 | Show for review |
| (no match) | < 0.50 | `no_match`, saved for later |

**No date window:** `runMatchingForItem()` fetches all open transactions with no date filter. The `scoreDate` function in `@polso/matching` decays to 0.0 beyond 90 days, so old transactions score low but are not excluded outright.

---

## IVA propagation on confirmation

Triggered on any confirmed match (auto or manual). Copies `taxAmount` and `taxRate` from InboxItem → Entry **only when the Entry field is currently null** — never overwrites existing data.

```typescript
prisma.entry.updateMany({
  where: { transactionId, organizationId, status: { not: "verified" } },
  data: { status: "verified", ...taxData },   // taxData is {} if fields already set
})
```

Files that duplicate this logic and must stay in sync:
- `packages/inbox/src/index.ts` — `persistMatchResult`, `confirmMatchInDb`
- `apps/web/features/inbox/actions/vault-actions.ts` — `confirmMatchAction`, `manualMatchAction`
- `apps/partner/features/matching/actions/handle-suggestion.ts` — `confirmSuggestionInternal`
- `apps/partner/features/matching/actions/bulk-confirm-suggestions.ts` — `confirmOne`

---

## Known gaps

| Gap | Notes |
|-----|-------|
| No scheduled retry for `no_match` items | Only retried passively on each GoCardless sync. If sync is infrequent, receipts sit unmatched silently. |
| No auto-archival after N days | `no_match` items accumulate indefinitely in the inbox. |
| No proactive stale-receipt alert | User is not notified if a receipt remains unmatched after, say, 7 days. (Partner receives a general receipt-reminder cron, but not item-specific.) |
| No retry counter / backoff | There is no `matchAttempts` field. Matching is retried on every sync regardless of how many times it has already failed. |

### What a deferred-reconciliation cron would look like

If we ever add one:

```
Every night (or every N hours):
  fetch InboxItems: status = "no_match", updatedAt > X days ago
  for each item → runMatchingForItem(organizationId, inboxItem.id)
  if still no_match after Y days → mark "archived" + notify user
```

This would be a second cron slot in `apps/web`. Given the Vercel Hobby 1-cron-per-project constraint,
it would need to piggyback on the existing `sync-transactions` cron or require a plan upgrade.
See `docs/ARCHITECTURE.md` and memory note on Vercel cron limits.
