# features/notifications

Builds the partner email digest (new clients, receipts uploaded, pending receipts) sent by the daily cron. No routes of its own.

## Files

- `lib/build-partner-digest.ts` — `buildPartnerDigest(partnerOrgId, cadence, now)` aggregates digest data for a partner's active clients over a 24h (daily) or 7d (weekly) window.

## Key flows

- Scopes everything to active `PartnerClient` links for the partner org — only linked clients appear in the digest.
- "New clients" = links with `connectedAt` inside the window; "receipts uploaded" = `InboxItem.createdAt` in window, grouped by client; "pending receipts" = current `InboxItem` count with status `new` or `no_match` (same predicate as the dashboard).
- Returns empty `DigestData` when the partner has no active client links.
- The cron (`runPartnerDigests` in `/api/cron/daily`) picks partners by `digestCadence` (daily every day, weekly only on Mondays UTC), resolves the recipient via `getPartnerNotificationEmail` (@polso/db), and emails via `sendPartnerDigest` (@polso/email).

## Data & integration

- Models: PartnerClient, InboxItem (reads only)
- Used by / uses: `app/api/cron/daily/route.ts`; consumed alongside `@polso/email/send` and `@polso/db`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
