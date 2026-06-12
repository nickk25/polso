# features/alerts

Smart financial alerts: cron-driven detection (low balance, high spend, runway, unusual activity, missed recurring, sync errors) and the /alerts page.

## Files

- `actions/update-alert.ts` — `markAlertReadAction`, `dismissAlertAction`, `markAllReadAction`, `dismissAllAction`; all revalidate `/alerts`
- `queries/get-alerts.ts` — `getAlerts(filters, page, pageSize, organizationId?)` (paginated, excludes dismissed, includes account/entry) and `getAlertStats()` (total/unread/critical)
- `lib/detect-alerts.ts` — six detectors: `detectLowBalanceAlerts`, `detectHighSpendAlerts`, `detectRunwayCriticalAlerts`, `detectUnusualActivityAlerts`, `detectMissedRecurringAlerts`, `detectSyncErrorAlerts`, plus `getUserEmailAndLocale` helper (raw SQL against `neon_auth.users_sync` + `user_preferences`)
- `components/` — `AlertTable` (selection, per-row read/dismiss, bulk actions), `AlertFilters` (type/severity/status via URL params), `AlertPagination`

## Key flows

- Detectors run per-org from the daily cron `/api/cron/sync-transactions`; thresholds/multipliers come from each user's `NotificationSetting`; in-app alerts only created when `orgWantsInAppAlerts()` (any member has `inAppAlerts`)
- Each detector dedups (24h per account, per category per month, 7d for runway, per-entry forever for unusual, 14d per pattern) before creating an `Alert`
- Detectors also send email via `@/lib/email/send` (`sendLowBalanceAlert`, `sendHighSpendAlert`, etc.) honoring per-user `emailAlerts` + per-type flags, localized by user locale
- Unusual-activity uses `detectAnomalies` from `@polso/intelligence` against 90-day category averages

## Data & integration

- Models: Alert, Account, Entry, Category, RecurringPattern, UserOrganization, NotificationSetting (+ raw `neon_auth.users_sync`, `user_preferences`)
- i18n namespace: `alerts`
- Used by / uses: `app/(dashboard)/alerts/page.tsx`, `app/(dashboard)/dashboard/page.tsx` (unread alerts in AgentSurface), `/api/cron/sync-transactions`, `features/notifications/lib/run-client-digests.ts`, agent `list_alerts` tool; uses `@polso/intelligence`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
