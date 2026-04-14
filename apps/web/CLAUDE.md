# apps/web — @polso/web

Next.js 16 dashboard app. App Router, React Server Components by default.

**Code templates:** See `../../docs/CODE_PATTERNS.md` for full annotated templates of every pattern below.

## Structure

```
app/(dashboard)/    Dashboard routes — one dir per feature
app/(marketing)/    Marketing + auth pages
features/           Feature modules — canonical reference: features/expenses/
  alerts/           Smart financial alerts (detect anomalies, notify user)
  analytics/        Cash flow, burn rate, runway, category breakdown
  banking/          Bank account connections via Tink (sync, reconnect, stale detection)
  billing/          Subscription management via Creem
  categories/       Transaction category CRUD
  clients/          Client contact management
  expenses/         Expense tracking, categorization, invoice upload
  export/           ZIP export (CSV + PDF summary + facturas/ folder)
  inbox/            Receipt upload and processing (OCR, match suggestions)
  income/           Income tracking
  intelligence/     AI suggestions surfaced from @polso/intelligence
  settings/         Profile, org, team, banking, preferences, notifications
  team/             Team member invitations and roles
  vendors/          Vendor management
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

## Authentication

Neon Auth (Better Auth). Auth logic lives in `@polso/auth`. Key files:
- `@polso/auth/get-session` — `getAuthContext()` → `{ userId, organizationId, user }`
- `@polso/auth/server` — `authServer` helper
- `@polso/auth/client` — `authClient` for client-side hooks
- `app/api/auth/[...path]/route.ts` — auth API handler
- `proxy.ts` — middleware, protects all routes except `/auth` and `/api/auth`

## Database Access

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

const { organizationId } = await getAuthContext()  // always first
const expenses = await prisma.expense.findMany({
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
- Naming: `verbEntityAction()` — e.g. `updateExpenseAction`, `createCategoryAction`
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
- Files: `messages/{en,es}/<namespace>.json` — one per feature, named after feature dir
- Standard keys: `table.*`, `fields.*`, `bulk.*`, `pagination.*`, `editSheet.*`
- Interpolation: `{count}`, `{start}`, `{end}`, `{total}`
- Plurals: `"{count, plural, one {item} other {items}}"`
- Register in `lib/i18n/messages.ts` — both `en` and `es`
- Common keys: `messages/{en,es}/common.json`

### Naming
- Files: kebab-case (`expense-table.tsx`, `get-expenses.ts`)
- Components: PascalCase (`ExpenseTable`)
- Functions: camelCase (`updateExpenseAction`, `getExpenses`)
- Routes: plural nouns (`/expenses`, `/incomes`, `/vendors`)

### UI Rules
- Always use `@polso/ui` components — query shadcn MCP first
- Import: `import { Button } from "@polso/ui/button"`
- Badge variants: `default` (positive), `outline` (neutral), `secondary` (muted), `destructive` (error)
- Toolbar buttons: `variant="ghost" size="sm"`
- Loading: `<Spinner className="h-4 w-4 animate-spin" />` (Phosphor)
- Sheet footer: `<SheetFooter className="mt-auto p-0">` — Cancel (outline) + Save (default)

## Environment Variables

```env
DATABASE_URL              # Neon PostgreSQL connection string
NEON_AUTH_BASE_URL        # Neon Auth endpoint
R2_ENDPOINT               # Cloudflare R2 endpoint
R2_ACCESS_KEY_ID          # R2 credentials
R2_SECRET_ACCESS_KEY      # R2 credentials
R2_BUCKET_NAME            # R2 bucket
TINK_CLIENT_ID            # Tink API client ID
TINK_CLIENT_SECRET        # Tink API client secret
TINK_REDIRECT_URI         # Tink redirect URI
CRON_SECRET               # Cron job authentication
RESEND_API_KEY            # Resend email
CREEM_API_KEY             # Creem billing
NEXT_PUBLIC_APP_URL       # App URL
```

## Configuration

- `components.json` — Shadcn/ui: `radix-lyra` style, zinc base, install path `packages/ui/src/components`
- `next.config.ts` — all `@polso/*` packages in `transpilePackages`
- `app/globals.css` — `@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}"` for Tailwind scanning
- `eslint.config.mjs` — v9 flat config, Next.js core-web-vitals
- `tsconfig.json` — extends `@polso/tsconfig/next.json`, `@/*` alias
