# apps/web — @polso/web

Next.js 16 dashboard app. App Router, React Server Components by default.

**Code templates:** See `../../docs/CODE_PATTERNS.md` for full annotated templates of every pattern below.

## Structure

```
app/(dashboard)/    Dashboard routes (dashboard, transactions, analytics, recurring,
                    categories, counterparties, export, vault, reports, alerts,
                    settings/*, account/[path] — Neon Auth AccountView)
app/(marketing)/    Marketing pages (landing, privacy, terms, invite/[token])
app/(onboarding)/   Onboarding flow (/onboarding)
app/onboarding/     consent/ — consent gate page (outside the (onboarding) group)
app/auth/           Neon Auth pages (auth/[path], auth/no-access)
app/api/            Route handlers — see API Routes below
features/           Feature modules — canonical reference: features/transactions/
  agent/            AI assistant — tools + widgets + shared runner (web/Telegram/WhatsApp channels)
  alerts/           Smart financial alerts (detect anomalies, notify user)
  analytics/        Cash flow, burn rate, runway, VAT summary, forecasts
  auth/             Consent recording + consent status queries (onboarding consent gate)
  banking/          Bank account connections via GoCardless (sync, reconnect, stale detection)
  billing/          Subscription management via Creem + plan limit checks
  categories/       Transaction category CRUD
  counterparties/   Counterparty management (auto-detection patterns, merge suggestions, backfill)
  export/           ZIP export (CSV + PDF summary + facturas/ folder)
  inbox/            Document vault — uploads, receipt↔transaction matching after sync
  intelligence/     Recurring pattern detection (powers /recurring)
  notifications/    Weekly client digest emails (run from the sync cron)
  onboarding/       Onboarding flow steps + complete-onboarding action
  overview/         Dashboard overview components (agent chat input)
  settings/         Profile, org, banking, preferences, notifications, agent links, partner access
  team/             Team member invitations, roles, client org provisioning
  transactions/     Transaction table, filters, bulk edit, document attachments
  waitlist/         Pre-launch waitlist
  <module>/
    actions/        Server actions ("use server")
    queries/        Read-only data fetching (plain async functions)
    components/     React components ("use client" or server)
    lib/            Feature-specific utilities (optional)
components/         Shared app components (layout, sidebar, providers)
lib/
  i18n/             next-intl config + messages registration
  db/               Shim → @polso/db
  types/            Shim → @polso/utils + @polso/db
  utils.ts          Shim → @polso/utils/cn
messages/           i18n JSON files
  en/<namespace>.json
  es/<namespace>.json
```

## Path Aliases

All `@/` paths resolve from `apps/web/`:

| Import | Resolves to |
|--------|-------------|
| `@/lib/db` | Shim → `@polso/db` (prisma singleton) |
| `@polso/auth/get-session` | `getAuthContext()` — from shared auth package |
| `@/lib/types` | Shim → `@polso/utils` + `@polso/db` types |
| `@/lib/utils` | Shim → `@polso/utils/cn` |
| `@polso/ui/<name>` | UI components — direct package import |
| `@/features/<module>/...` | Feature modules |

Shims exist for backward compatibility. Both `@/lib/db` and `@polso/db` work; prefer `@polso/*` for new code.

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/[...path]` | Neon Auth handler |
| `/api/chat` | Dashboard AI assistant — `streamText` with agent tools, attachment support, AI rate limit via `@polso/cache` |
| `/api/banking/sync-status` | Poll bank sync progress |
| `/api/cron/sync-transactions` | Daily cron (vercel.json, `maxDuration: 300`) — bank sync, recurring detection, alerts, weekly client digests, requisition cleanup |
| `/api/gocardless/create-link` | Create GoCardless requisition link |
| `/api/gocardless/callback` | GoCardless callback — account details/balances degrade gracefully per account on transient failures; kicks off initial sync |
| `/api/gocardless/institutions` | List banks for a country |
| `/api/exports/[id]` | Re-download a stored export ZIP from R2 |
| `/api/inbox/[id]` | Proxy inbox/vault file from R2 |
| `/api/profile-image/[userId]` | Proxy profile image from R2 |
| `/api/transaction-documents/upload-url` | Upload URL for transaction document attachments |
| `/api/vault/upload` | Vault file upload |
| `/api/webhooks/creem` | Creem billing webhook (verified with `CREEM_WEBHOOK_SECRET`) |
| `/api/webhooks/telegram` | Telegram bot — agent chat + receipt OCR (handles `FileTooLargeError` from `@polso/agent/ocr`) |
| `/api/webhooks/whatsapp` | WhatsApp bot — agent chat + receipt OCR (handles `FileTooLargeError` from `@polso/agent/ocr`) |

## Authentication

Neon Auth (Better Auth). Auth logic lives in `@polso/auth`. Key files:
- `@polso/auth/get-session` — `getAuthContext()` → `{ userId, organizationId, user }`
- `@polso/auth/server` — `authServer` helper
- `@polso/auth/client` — `authClient` for client-side hooks
- `app/api/auth/[...path]/route.ts` — auth API handler
- `proxy.ts` — middleware. `neonAuthMiddleware` protects the dashboard routes listed in `protectedPaths`; public routes (`/`, `/auth`, `/invite`, …) get a `NEXT_LOCALE` cookie from `Accept-Language` detection

## Database Access

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

const { organizationId } = await getAuthContext()  // always first
const transactions = await prisma.transaction.findMany({
  where: { organizationId },                        // always scope to org
})
```

Schema lives in `packages/db/prisma/schema.prisma`. After changes: `pnpm --filter @polso/db db:generate`.

## Code Generation Rules

### Server Actions
- File: `features/<module>/actions/<verb>-<entity>.ts`
- First line: `"use server"`
- First line in try: `const { organizationId } = await getAuthContext()`
- Return: `Promise<ActionResponse<T>>` via `successResponse()` / `errorResponse()`
- Error codes: `VALIDATION_ERROR` | `NOT_FOUND` | `FORBIDDEN` | `DUPLICATE_ERROR` | `ERROR`
- Always `revalidatePath("/route")` + `revalidatePath("/dashboard")` after mutations
- Naming: `verbEntityAction()` — e.g. `updateTransactionAction`, `createCategoryAction`
- Bulk: `bulkUpdateEntityFieldAction(ids: string[], value: T)`
- Define input/result interfaces locally — not in shared types

### Queries
- File: `features/<module>/queries/get-<entity>.ts`
- Export typed interfaces: `EntityWithRelations`, `EntityFilters`, `EntityStats`
- Always filter by `organizationId` first
- `Promise.all([findMany, count])` for parallel list + count
- `include` with explicit `select` — never include all fields
- Stats: `.aggregate()` with `_sum`, `_count`
- Named exports only

### Components
- File: `features/<module>/components/<entity>-<type>.tsx`
- `"use client"` for interactive components
- Icons: `@phosphor-icons/react` (client) / `@phosphor-icons/react/dist/ssr` (server)
- Table: checkbox selection, row click → Sheet edit, bulk action bar
- Sheet pattern: `selectedEntity` state → `handleRowClick` → `handleSave` → `router.refresh()`
- Filters: read from props, update URL via `router.push()`, debounce search 300ms, reset page on filter change
- Form fields: `<div className="space-y-2"><Label /><Control /></div>`
- Named exports only

### Pages
- File: `app/(dashboard)/<route>/page.tsx`
- Server component — no `"use client"`
- `searchParams: Promise<{ page?: string; ... }>` — always `await`
- `await getTranslations("namespace")` from `next-intl/server`
- `Promise.all([getData(), getStats(), getRelated()])` — parallel fetching
- Layout: `<div className="flex flex-col gap-6 p-6">` → title → stats grid → filters → Card with table
- Three empty states: has matching data / filtered-empty / no data at all

### i18n
- Files: `messages/{en,es}/<namespace>.json` — one per feature or route (e.g. `transactions.json`, `vault.json`, `dashboard.json`)
- Standard keys: `table.*`, `fields.*`, `bulk.*`, `pagination.*`, `editSheet.*`
- Interpolation: `{count}`, `{start}`, `{end}`, `{total}`
- Plurals: `"{count, plural, one {item} other {items}}"`
- Register in `lib/i18n/messages.ts` — both `en` and `es`
- Common keys: `messages/{en,es}/common.json`

### Naming
- Files: kebab-case (`transaction-table.tsx`, `get-transactions.ts`)
- Components: PascalCase (`TransactionTable`)
- Functions: camelCase (`updateTransactionAction`, `getTransactions`)
- Routes: plural nouns (`/transactions`, `/counterparties`, `/categories`)

### UI Rules
- Always use `@polso/ui` components — query shadcn MCP first
- Import: `import { Button } from "@polso/ui/button"`
- Badge variants: `default` (positive), `outline` (neutral), `secondary` (muted), `destructive` (error)
- Toolbar buttons: `variant="ghost" size="sm"`
- Loading: `<Spinner className="h-4 w-4 animate-spin" />` (Phosphor)
- Sheet footer: `<SheetFooter className="mt-auto p-0">` — Cancel (outline) + Save (default)

## Environment Variables

```env
DATABASE_URL                    # Neon PostgreSQL connection string (via @polso/db)
NEON_AUTH_BASE_URL              # Neon Auth endpoint
R2_ENDPOINT                     # Cloudflare R2 endpoint (via @polso/storage)
R2_ACCESS_KEY_ID                # R2 credentials
R2_SECRET_ACCESS_KEY            # R2 credentials
R2_BUCKET_NAME                  # R2 bucket
GOCARDLESS_SECRET_ID            # GoCardless Bank Account Data secret ID
GOCARDLESS_SECRET_KEY           # GoCardless Bank Account Data secret key
GOCARDLESS_REDIRECT_URI         # GoCardless OAuth callback URI
CRON_SECRET                     # Cron job authentication
RESEND_API_KEY                  # Resend email (via @polso/email)
EMAIL_FROM                      # Sender address (via @polso/email)
EMAIL_FROM_FOUNDER              # Founder sender address (via @polso/email)
RESEND_WAITLIST_SEGMENT_ID      # Resend audience segment for waitlist signups
CREEM_API_KEY                   # Creem billing (via @polso/billing)
CREEM_WEBHOOK_SECRET            # Verifies /api/webhooks/creem signatures
CREEM_*_PRODUCT_ID              # Starter/Business × monthly/annual product IDs (via @polso/billing)
CREEM_TEST_MODE                 # Creem sandbox toggle (via @polso/billing)
ANTHROPIC_API_KEY_CHAT          # Claude API — /api/chat + agent runner (web/Telegram/WhatsApp)
ANTHROPIC_API_KEY_OCR           # Claude API — receipt OCR (via @polso/agent/ocr)
TELEGRAM_BOT_TOKEN              # Telegram bot (via @polso/agent)
TELEGRAM_WEBHOOK_SECRET_TOKEN   # Verifies /api/webhooks/telegram
WHATSAPP_ACCESS_TOKEN           # WhatsApp Cloud API (via @polso/agent)
WHATSAPP_PHONE_NUMBER_ID        # WhatsApp sender number (via @polso/agent)
WHATSAPP_APP_SECRET             # Verifies /api/webhooks/whatsapp signatures
WHATSAPP_WEBHOOK_VERIFY_TOKEN   # WhatsApp webhook GET verification
UPSTASH_REDIS_REST_URL          # AI rate limiting via @polso/cache (fails open if unset)
UPSTASH_REDIS_REST_TOKEN        # AI rate limiting via @polso/cache
NEXT_PUBLIC_APP_URL             # App URL
NEXT_PUBLIC_PARTNER_APP_URL     # Partner app URL — partner-invite redirects
PUBLIC_SIGNUP_ENABLED           # "true" to allow self-registration; omit/false for invite-only (default)
```

## Configuration

- `components.json` — Shadcn/ui: `radix-lyra` style, zinc base, install path `packages/ui/src/components`
- `next.config.ts` — all `@polso/*` packages in `transpilePackages`
- `app/globals.css` — `@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}"` for Tailwind scanning
- `eslint.config.mjs` — v9 flat config, Next.js core-web-vitals
- `tsconfig.json` — extends `@polso/tsconfig/next.json`, `@/*` alias
