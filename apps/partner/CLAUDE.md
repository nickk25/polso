# apps/partner — @polso/partner

Second app in the monorepo. A private dashboard for accounting advisors (asesorías) to manage multiple client organisations. Not publicly indexed (`robots: noindex`).

## Structure

```
app/(dashboard)/          Dashboard routes — all protected
  page.tsx                Partner overview: KPIs, work queue, client progress
  clients/
    page.tsx              Client list
    [clientId]/
      page.tsx            Client detail mini-dashboard
      inbox/              Unmatched receipts for this client
      transactions/       All transactions for this client
      conciliation/       AI-suggested matches to confirm
  invite/                 Send client invitation
  settings/               Partner settings (CSV separator, etc.)
app/api/
  auth/                   Neon Auth handler
  export/                 GET — builds ZIP (CSV + facturas/) and returns it
  exports/[id]/           GET — re-download a stored export from R2
  inbox/[id]/             GET — proxy inbox file from R2
  invoices/[invoiceId]/   GET — proxy expense invoice from R2
  cron/                   POST — proactive monitoring (stale accounts, reminders)
features/
  clients/                Client relationships + overview queries
  export/                 Exportable data query, CSV generator, ZIP generator
  inbox/                  Receipt upload action, inbox item queries
  matching/               AI suggestion queries + confirm/reject actions
  proactive/              Send-reminder action + SendReminderButton component
  settings/               CSV separator action + component
  transactions/           Transaction list queries + filters
components/
  export/                 ExportForm (date range → ZIP download)
  layout/                 Sidebar, nav, breadcrumb
  providers/              AuthProvider
lib/
  auth.ts                 getPartnerAuthContext() — see Authentication below
  db.ts                   Shim → @polso/db
```

## Authentication

Partner uses Neon Auth directly (not the `@polso/auth` package). The auth helper is local:

```typescript
import { getPartnerAuthContext } from "@/lib/auth"

const ctx = await getPartnerAuthContext()
// ctx = { userId, organizationId, orgType }

// Guard: only partner orgs can access
if (ctx.orgType !== "partner") return new NextResponse("Forbidden", { status: 403 })
```

`getPartnerAuthContext()` is cached per-request via `React.cache()`. Safe to call multiple times per render tree.

The layout (`app/(dashboard)/layout.tsx`) calls `neonAuth()` + `getOrCreatePartnerOrg()` on every request — by the time any page renders, the `UserOrganization` record is guaranteed to exist.

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
Same as `apps/web` — each feature has `queries/`, `actions/`, `components/` — but **no i18n**. All UI strings are hardcoded Spanish.

### API routes
Used for file downloads and cron (not for data mutations — those use Server Actions):

```typescript
// apps/partner/app/api/export/route.ts
export async function GET(request: NextRequest) {
  const ctx = await getPartnerAuthContext()
  if (ctx.orgType !== "partner") return new NextResponse("Forbidden", { status: 403 })
  // ...
}
```

### Server Actions
Same pattern as `apps/web` but simpler — no `ActionResponse` wrapper required (use `toast` directly in components):

```typescript
"use server"
import { getPartnerAuthContext } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function someAction(input: string) {
  const ctx = await getPartnerAuthContext()
  // mutate...
  revalidatePath("/settings")
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

## Export Flow

`GET /api/export?clientId=&from=&to=` → builds ZIP in memory:
1. `getExportableData()` — fetches transactions + attachment R2 paths
2. `generateCsv()` — 12-column CSV with renamed attachment filenames
3. Fetches each attachment from R2 in parallel via `getFile()`
4. `generateZip()` — `transacciones.csv` at root + `facturas/` folder
5. Returns ZIP as response; fire-and-forget uploads ZIP to R2 + creates `Export` record

History re-downloads: `GET /api/exports/[id]` — fetches ZIP from R2 by export ID.

CSV separator is stored per partner org (`Organization.csvSeparator`) and managed via `/settings`.

## Proactive Monitoring (Cron)

`POST /api/cron` — runs on a schedule (Vercel cron, see `vercel.json`).

Checks all active partner↔client links for:
- Stale bank syncs (no activity > N days)
- Silent clients (no inbox activity)
- Month-end coverage reminders

`SendReminderButton` is disabled for 24h after last contact to prevent spam.

## Environment Variables

```env
DATABASE_URL              # Neon PostgreSQL pooler connection string
DATABASE_URL_UNPOOLED     # Direct connection (for migrations)
NEON_AUTH_BASE_URL        # Neon Auth endpoint
R2_ENDPOINT               # Cloudflare R2
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
TELEGRAM_BOT_TOKEN        # Telegram reminder bot
TELEGRAM_WEBHOOK_SECRET_TOKEN
ANTHROPIC_API_KEY_OCR     # AI matching / OCR
CRON_SECRET               # Cron job auth header
PUBLIC_SIGNUP_ENABLED     # "true" to allow self-registration; omit/false for invite-only (default)
```

## Configuration

- `next.config.ts` — all `@polso/*` in `transpilePackages`
- `app/globals.css` — `color-scheme: light`, `@source` for `@polso/ui`
- `app/layout.tsx` — `viewport: { themeColor: "#ffffff", colorScheme: "light" }` — pinned to light mode, never dark
- No i18n — all strings are hardcoded Spanish
