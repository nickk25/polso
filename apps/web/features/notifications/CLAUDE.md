# features/notifications

Weekly digest emails for client organizations. No dashboard route or UI — runs from the daily sync cron.

## Files

- `lib/build-client-digest.ts` — `buildClientDigest(organizationId, now)`: aggregates the last 7 days vs the prior week — total spend + delta %, top 3 categories, active account balances, unmatched receipt count, recent non-dismissed alerts, top 5 largest expenses
- `lib/run-client-digests.ts` — `runClientWeeklyDigests(now)`: iterates all `type: "client"` orgs, resolves members whose NotificationSetting has both `emailAlerts` AND `emailWeeklyDigest` enabled, builds one digest per org and sends per recipient

## Key flows

- Called from `/api/cron/sync-transactions` (the single web-app Vercel cron slot); returns `{ digestsSent, digestErrors }` for the cron response
- Sends via `sendClientWeeklyDigest` from `@polso/email/send`; recipient email/name/locale resolved with `getUserEmailAndLocale` from `features/alerts/lib/detect-alerts`
- Send failures per recipient are caught and logged (`.catch(console.error)`); per-org failures increment `digestErrors` without aborting other orgs
- Excluded entries (`status: "excluded"`) are ignored in all aggregates; unmatched receipts = InboxItems with no attachments

## Data & integration

- Models: Organization, UserOrganization, NotificationSetting, Entry, Account, Category, InboxItem, Alert
- Used by / uses: `/api/cron/sync-transactions`; uses `@polso/email`, `features/alerts` (user lookup)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
