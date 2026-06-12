# features/clients

Client portfolio management for the advisor: invitations (single + bulk), client list/detail, and quarter-close pendings. Serves `/clients`, `/clients/[clientId]`, and the dashboard `/`.

## Files

- `actions/invite-client.ts` — `inviteClientAction` creates an `Invitation` (role `partner_client`, nanoid token) and emails it; also `disconnectClientAction` (sets PartnerClient status to `disconnected`)
- `actions/bulk-invite.ts` — up to 100 rows, in-list dedup + skips emails with existing pending invites, sends in chunks of 5 via `Promise.allSettled`, returns per-row sent/skipped/failed
- `actions/resend-invite.ts` — resend pending invite; blocks expired and rate-limits to once per hour (`emailSentAt`)
- `actions/revoke-invite.ts` — sets pending invitation to `revoked`
- `actions/update-invite-email.ts` — changes email and regenerates token (old link dies), resets email status, resends
- `lib/parse-bulk-rows.ts` — parses pasted `name,email` lines (splits on last comma), counts invalid rows
- `queries/get-client-list.ts` — merged list: pending/expired/revoked invitations first, then PartnerClient rows with unmatched inbox count, last sync, last proactive contact
- `queries/get-client-detail.ts` — client header data: accounts (sync status/errors), unmatched inbox count, 30d expenses, last proactive message
- `queries/get-client-overview.ts` — month totals, receipt coverage %, top 5 pending match suggestions, recent pending inbox items
- `queries/get-client-quarter-pendings.ts` — current quarter: entries missing IVA, transactions without receipt, pending suggestions
- `queries/get-partner-quarter-rollup.ts` — same pendings grouped across ALL active clients, sorted by most pending; returns null if no clients
- `components/` — `ClientPendingsCard`: quarter-close checklist linking to `/transactions` and `/conciliation`, days-to-close color coding

## Key flows

- Per-client queries (`detail`, `overview`, `quarter-pendings`) verify the active `PartnerClient` link first and `notFound()` without it; the rollup filters by `partnerId, status: "active"` instead
- All invite actions gate on `ctx.orgType === "partner"` via `getPartnerAuthContext()`; invitations are kept even if the email send fails (`emailStatus: "failed"` + `emailError`)
- Invitation expiry comes from `Organization.invitationExpiryDays` (default 7); invite actions revalidate `/clients` and `/`
- "Documented" / "not documented" counts reuse `transactionDocumentedWhere` / `transactionNotDocumentedWhere` from `@polso/db`

## Data & integration

- Models: PartnerClient, Invitation, Organization, Account, Entry, Transaction, InboxItem, MatchSuggestion, ProactiveMessage, UserOrganization
- Used by / uses: `app/(dashboard)/page.tsx`, `app/(dashboard)/clients/page.tsx`, `app/(dashboard)/clients/[clientId]/page.tsx`, `components/clients/*` dialogs; `@polso/email/send`, `@polso/utils/quarters`, `@polso/db`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
