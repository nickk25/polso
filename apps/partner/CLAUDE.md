# apps/partner — @polso/partner

Second app in the monorepo. A private dashboard for accounting advisors (asesorías) to manage multiple client organisations. Not publicly indexed (`robots: { index: false, follow: false }`).

## Structure

```
app/(dashboard)/          Dashboard routes — all protected
  page.tsx                Partner overview: quarter rollup, client status, reminders (single + bulk)
  clients/
    page.tsx              Client list + invitations (single, bulk, resend, revoke)
    [clientId]/
      page.tsx            Client detail mini-dashboard
      inbox/              Unmatched receipts for this client
      transactions/       All transactions for this client
      conciliation/       AI-suggested matches to confirm
      export/             Export form for this client (date range → ZIP)
  settings/               Tabbed settings — Spanish sub-routes
    page.tsx              General (org profile, logo)
    perfil/               Profile + profile image
    equipo/               Team members + invitations
    notificaciones/       Notification + reminder settings
    preferencias/         Theme, invitation expiry
    regional/             Regional settings, CSV separator, export defaults
app/api/
  auth/                   Neon Auth handler
  export/                 GET — builds ZIP (CSV + facturas/) and returns it
  exports/[id]/           GET — re-download a stored export from R2
  inbox/[id]/             GET — proxy inbox file from R2
  invoices/[invoiceId]/   GET — proxy expense invoice from R2
  org-logo/[orgId]/       GET — proxy organization logo from R2
  profile-image/[userId]/ GET — proxy profile image from R2
  cron/daily/             GET (POST aliases to GET) — daily proactive agent + digests
app/auth/[path]/          Neon Auth pages
app/not-partner/          Shown when the signed-in user has no partner org
features/
  analytics/              Per-client P&L table + VAT summary card
  clients/                Client list/detail/overview queries, quarter rollups, invitations (single + bulk CSV)
  export/                 Exportable data query, CSV generator (3 formats), ZIP generator
  inbox/                  Receipt upload action, inbox item queries
  matching/               AI suggestion queries + confirm/reject/bulk-confirm actions
  notifications/          Partner digest builder (emailed from cron)
  proactive/              Reminder actions (generic, bank reconnect, receipt request, bulk), trigger evaluation, Telegram/WhatsApp delivery
  settings/               Org profile, logo, profile image, team, notifications, reminders, regional, CSV separator, export defaults, invitation expiry, theme
  team/                   Teammate invitations (invite, remove, revoke)
  transactions/           Client transaction queries, table, filters, entry/tax updates (single + bulk)
components/
  bank/                   BankReconnectButton
  clients/                Client list table, status badge, invite dialogs (single, bulk, edit-email)
  dashboard/              BulkReminderButton
  export/                 ExportForm (date range → ZIP download)
  inbox/                  Inbox UI
  layout/                 Sidebar, dashboard header, breadcrumb
  matching/               Matching UI
  providers/              AuthProvider
  transactions/           Transaction UI
lib/
  auth.ts                 getPartnerAuthContext() — see Authentication below
  db.ts                   Shim → @polso/db
  format.ts, time.ts, logo-url.ts, upload.ts
```

## Authentication

The auth helper wraps `@polso/auth`:

```typescript
// lib/auth.ts
import { cache } from "react"
import { getAuthContextWithType, type PartnerAuthContext } from "@polso/auth/get-session"

export const getPartnerAuthContext = cache(getAuthContextWithType)
```

```typescript
import { getPartnerAuthContext } from "@/lib/auth"

const ctx = await getPartnerAuthContext()
// ctx = { userId, organizationId, orgType }
```

- `getAuthContextWithType()` only resolves orgs with `type: "partner"` — it throws if the user has no partner org. Cached per-request via `React.cache()`, safe to call multiple times per render tree.
- API routes still guard explicitly: `if (ctx.orgType !== "partner") return new NextResponse("Forbidden", { status: 403 })`.
- The layout (`app/(dashboard)/layout.tsx`) calls `neonAuth()` and looks up the partner org. If `PUBLIC_SIGNUP_ENABLED === "true"` it creates one on the fly (`getOrCreatePartnerOrg`); otherwise users without a partner org are redirected to `/not-partner`.
- `proxy.ts` — `neonAuthMiddleware` protects everything except `/auth`, `/not-partner`, `/api`, and static assets.

## Database Access

```typescript
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"

const ctx = await getPartnerAuthContext()

// Always verify the partner → client link before accessing client data
const link = await prisma.partnerClient.findFirst({
  where: { partnerId: ctx.organizationId, clientId, status: "active" },
})
if (!link) notFound()
```

**Key rule:** every query touching client data must first assert an active `PartnerClient` link. Never query a client org directly with only `clientId`.

## Code Patterns

### Feature structure
Same as `apps/web` — each feature has `queries/`, `actions/`, `components/`, optional `lib/` — but **no i18n**. All UI strings are hardcoded Spanish.

### API routes
Used for file downloads/proxies and cron (not for data mutations — those use Server Actions):

```typescript
// apps/partner/app/api/export/route.ts
export async function GET(request: NextRequest) {
  const ctx = await getPartnerAuthContext()
  if (ctx.orgType !== "partner") return new NextResponse("Forbidden", { status: 403 })
  // ...
}
```

### Server Actions
Same pattern as `apps/web` but simpler — no `ActionResponse` wrapper required; return a plain `{ success, error? }` object and use `toast` directly in components:

```typescript
"use server"
import { getPartnerAuthContext } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function someAction(input: string) {
  const ctx = await getPartnerAuthContext()
  // mutate...
  revalidatePath("/settings")
  return { success: true }
}
```

### Path aliases
`@/` resolves from `apps/partner/`. No shim differences from `apps/web`.

## Key Models

| Model | Purpose |
|-------|---------|
| `PartnerClient` | Links a partner org to a client org (`status: "active"`) |
| `InboxItem` | Receipt/document uploaded by client — `filePath` is R2 key |
| `TransactionAttachment` | Confirmed link between `Transaction` ↔ `InboxItem` |
| `MatchSuggestion` | AI-generated transaction↔receipt match proposal |
| `Export` | Export history record — `filePath` is R2 key for ZIPs or `csv:...` for legacy |
| `ProactiveMessage` | Log of proactive reminders sent to clients (rate limiting + context) |
| `Invitation` | Client/teammate invitations (expiry configurable per org) |

## Export Flow

`GET /api/export?clientId=&from=&to=&format=` → builds ZIP in memory:
1. `getExportableData()` — fetches transactions + attachment R2 paths
2. `generateCsv()` — 14-column Spanish-header CSV (includes IVA % + cuota); `format` is `standard` | `a3` | `sage`
3. Fetches each attachment from R2 in parallel via `getFile()` (missing files are skipped, not fatal)
4. `generateZip()` — CSV at root + `facturas/` folder
5. Returns ZIP as response; fire-and-forget uploads ZIP to R2 + creates `Export` record (`format`, `generatedByOrgId`)

History re-downloads: `GET /api/exports/[id]` — fetches ZIP from R2 by export ID.

CSV separator (`Organization.csvSeparator`, default `;`) and export defaults are stored per partner org and managed via `/settings/regional`. Per-client export UI lives at `/clients/[clientId]/export`.

## Daily Cron

`GET /api/cron/daily` (Vercel cron, `30 7 * * *` — see `vercel.json`; `POST` aliases to `GET`). Auth: `Authorization: Bearer ${CRON_SECRET}`. Runs three jobs in parallel:

1. **Proactive agent** — for each client org with a linked Telegram or WhatsApp channel: `evaluateTriggers()` decides what to send (summary, anomaly alert, receipt reminder), `generateProactiveMessage()` (Claude Haiku via `@polso/agent/proactive`) writes it, `sendProactiveMessage()` delivers (Telegram preferred, WhatsApp fallback) and logs to `ProactiveMessage`. Max 1 message/day/org + AI rate limit via `@polso/cache`.
2. **Partner digests** — `buildPartnerDigest()` per partner org, emailed via `@polso/email` `sendPartnerDigest()` according to the org's cadence.
3. **Stuck inbox recovery** — `recoverStuckInboxItems()` from `@polso/inbox`.

Then prunes old `ProactiveMessage` context. Manual reminders (`SendReminderButton`, default `cooldownHours = 24`) prevent spam after recent contact.

## Environment Variables

```env
DATABASE_URL                  # Neon PostgreSQL connection string (via @polso/db)
NEON_AUTH_BASE_URL            # Neon Auth endpoint
R2_ENDPOINT                   # Cloudflare R2 (via @polso/storage)
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
ANTHROPIC_API_KEY_OCR         # Proactive message generation + OCR (via @polso/agent)
TELEGRAM_BOT_TOKEN            # Proactive reminders via Telegram (via @polso/agent)
WHATSAPP_ACCESS_TOKEN         # Proactive reminders via WhatsApp (via @polso/agent)
WHATSAPP_PHONE_NUMBER_ID      # WhatsApp sender number (via @polso/agent)
RESEND_API_KEY                # Partner digest emails (via @polso/email)
EMAIL_FROM                    # Sender address (via @polso/email)
UPSTASH_REDIS_REST_URL        # AI rate limiting via @polso/cache (fails open if unset)
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET                   # Cron job auth header
NEXT_PUBLIC_APP_URL           # Web app URL (invite links, message links, asset URLs)
PUBLIC_SIGNUP_ENABLED         # "true" to auto-create partner orgs on sign-up; omit/false for invite-only (default)
```

## Configuration

- `next.config.ts` — all `@polso/*` in `transpilePackages`
- `app/globals.css` — `color-scheme: light`, `@source` for `@polso/ui`
- `app/layout.tsx` — `viewport: { themeColor: "#ffffff", colorScheme: "light" }` — pinned to light mode, never dark
- No i18n — all strings are hardcoded Spanish
