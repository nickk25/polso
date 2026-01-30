# Email Triggers

This document lists all email templates and where they should be triggered.

## Status

| Status | Meaning |
|--------|---------|
| ✅ | Connected |
| ⏳ | Pending implementation |

## Onboarding

| Email | Trigger | Status |
|-------|---------|--------|
| `waitlist-founder` | User joins waitlist | ✅ `features/waitlist/actions/join-waitlist.ts` |
| `welcome` | User creates account | ⏳ Auth callback/webhook |
| `welcome-founder` | 1 day after signup | ⏳ Manual or cron job |

> Note: `waitlist-confirmation` template exists but is not used. Using `waitlist-founder` for a more personal touch.

## Trial & Subscription

| Email | Trigger | Status |
|-------|---------|--------|
| `trial-started` | User starts trial | ⏳ Subscription webhook (Creem) |
| `trial-ending` | 3 days before trial ends | ⏳ Cron job |
| `trial-ended` | Trial expires | ⏳ Cron job or subscription webhook |
| `subscription-confirmed` | Payment successful | ⏳ Subscription webhook (Creem) |
| `payment-failed` | Payment fails | ⏳ Subscription webhook (Creem) |
| `subscription-cancelled` | User cancels | ⏳ Subscription webhook (Creem) |

## Bank Sync

| Email | Trigger | Status |
|-------|---------|--------|
| `bank-connected` | Plaid Link success | ⏳ After Plaid token exchange |
| `bank-disconnected` | Plaid item error (ITEM_LOGIN_REQUIRED) | ⏳ Plaid webhook handler |
| `sync-error` | 3+ consecutive sync failures | ⏳ Transaction sync cron job |

## Alerts

| Email | Trigger | Status |
|-------|---------|--------|
| `alert-low-balance` | Balance drops below threshold | ⏳ Alert detection cron job |
| `alert-high-spend` | Category spend exceeds threshold | ⏳ Alert detection cron job |
| `alert-missing-recurring` | Expected recurring payment not found | ⏳ Recurring detection cron job |
| `alert-unusual-activity` | Expense 2x+ above category average | ⏳ Alert detection cron job |
| `alert-runway-critical` | Runway drops below threshold | ⏳ Alert detection cron job |

## Team

| Email | Trigger | Status |
|-------|---------|--------|
| `user-invited` | Admin invites team member | ⏳ Invite action |
| `user-accepted-invite` | Invited user accepts | ⏳ Accept invite action |

---

## Implementation Notes

### Delayed Emails (1 day after)

For `waitlist-founder` and `welcome-founder`, options:

1. **Resend scheduled send** — Pass `scheduledAt` to `resend.emails.send()`
2. **Cron job** — Daily job that checks signups from 24h ago
3. **Queue system** — More complex, overkill for now

### Subscription Webhooks

Creem (or Stripe) sends webhooks for:
- `checkout.completed` → `trial-started` or `subscription-confirmed`
- `subscription.updated` → Check status changes
- `invoice.payment_failed` → `payment-failed`
- `subscription.cancelled` → `subscription-cancelled`

### Alert Detection

Run daily cron that:
1. Checks account balances vs thresholds
2. Checks category spending vs thresholds
3. Checks runway vs threshold
4. Detects unusual transactions
5. Checks for missing recurring payments

### Plaid Webhooks

Set up webhook endpoint for:
- `ITEM_LOGIN_REQUIRED` → `bank-disconnected`
- `SYNC_UPDATES_AVAILABLE` → Trigger sync
- `ERROR` → `sync-error` after 3 failures
