# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polso is a financial management and expense intelligence SaaS platform for businesses. It connects to banks via Tink (Open Banking), syncs transactions, detects recurring expenses, auto-categorizes spending, and provides analytics (burn rate, runway, cash flow).

This is a **pnpm + Turborepo monorepo** with one app (`apps/web`) and ten shared packages (`packages/*`).

**Architecture documentation**: See `docs/ARCHITECTURE.md` for full database schema, feature modules, and data flows.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Full-stack React framework with App Router |
| **Prisma 7** | ORM for database access |
| **Neon PostgreSQL** | Serverless Postgres database |
| **Neon Auth** | Authentication (built on Better Auth) |
| **Cloudflare R2** | Object storage for invoices and exports |
| **Tink** | Bank account connections via Open Banking (EU/Spain) |
| **Shadcn/ui** | UI components (Radix primitives) |
| **Tailwind CSS v4** | Styling |
| **Resend** | Transactional email |
| **Creem** | Billing and subscriptions |
| **pnpm + Turborepo** | Monorepo tooling |

## Core Modules

| Module | Purpose |
|--------|---------|
| Banking | Bank connection via Open Banking, transaction sync |
| Expenses | Expense management with invoices, categories, vendors |
| Intelligence | Recurring detection, auto-categorization |
| Analytics | Burn rate, runway, cash flow, KPIs |
| Export | ZIP with invoices + CSV/PDF for accountant |

## Core Entities

- `organizations` - Multi-tenant root
- `accounts` - Connected bank accounts
- `transactions` - Raw bank transactions
- `expenses` - Enriched transactions with metadata
- `categories` - System + custom expense categories
- `vendors` - Detected/created suppliers
- `recurring_patterns` - Detected fixed expenses

## UI Components - IMPORTANT

**Always use Shadcn/ui components for all UI development.** Do not create custom components when a Shadcn component exists.

- Use the **shadcn MCP server** to discover available components and get usage examples
- When unsure about a component, query the MCP first before implementing
- Install components via CLI: `pnpm dlx shadcn@latest add <component-name>`
- Components use Radix UI primitives, Phosphor icons, and the `radix-lyra` style

## Commands

```bash
# Development
pnpm dev                              # Start all (turbo)
pnpm --filter @polso/web dev          # Start web app only

# Build & lint
pnpm build                            # Build all packages + app
pnpm lint                             # Lint all packages

# Database (Prisma lives in packages/db)
pnpm --filter @polso/db db:generate   # Generate Prisma client
pnpm --filter @polso/db db:push       # Push schema to database
pnpm --filter @polso/db db:migrate    # Create and apply migration
pnpm --filter @polso/db db:seed       # Seed database
```

## Project Structure

```
polso-monorepo/
  apps/
    web/                        @polso/web — Next.js 16 dashboard app
      app/(dashboard)/          Dashboard routes
      app/(marketing)/          Marketing pages
      features/                 Feature modules (actions, queries, components)
      components/               Shared app components (layout, providers)
      lib/                      Auth, i18n config, shims
      messages/                 i18n JSON (en/, es/)
  packages/
    banking/     @polso/banking       Tink Open Banking client
    billing/     @polso/billing       Creem payment integration
    db/          @polso/db            Prisma schema, client, generated types
    email/       @polso/email         Resend + 20 email templates
    intelligence/ @polso/intelligence Auto-categorization, recurring detection
    plans/       @polso/plans         Plan limits, pricing, features
    storage/     @polso/storage       Cloudflare R2 client
    tsconfig/    @polso/tsconfig      Shared TS configs (base, next, library)
    ui/          @polso/ui            26 Shadcn/ui components + hooks
    utils/       @polso/utils         cn(), ActionResponse, shared enums
```

## Monorepo

- Packages are linked with `workspace:*` in `package.json`
- All `@polso/*` packages must be listed in `transpilePackages` in `apps/web/next.config.ts` — they export raw `.tsx`/`.ts` source (no build step)
- Tailwind v4 needs `@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}"` in `globals.css` to scan UI component classes
- To add a new package: create `packages/<name>/`, add `package.json` with `@polso/<name>` scope, add to `transpilePackages` in `next.config.ts`

## Architecture

- **App Router**: All routes in `apps/web/app/`, uses React Server Components by default
- **Server Actions**: All mutations use server actions with `"use server"` directive
- **Path Aliases**: Use `@/` for app-local imports within `apps/web/`
  - `@/lib/db` → Prisma client (shim to `@polso/db`)
  - `@/lib/auth` → Neon Auth utilities (app-local, not extracted)
  - `@/lib/types` → ActionResponse + Prisma types (shim to `@polso/utils` + `@polso/db`)
  - `@/lib/utils` → `cn()` helper (shim to `@polso/utils/cn`)
  - `@/features` → Feature modules
  - `@polso/ui/<component>` → UI components (direct package import, not `@/components/ui`)
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming (oklch color space, light/dark mode)
- **Fonts**: JetBrains Mono (primary), Geist Sans and Geist Mono via next/font

## Authentication

Neon Auth (Better Auth) handles authentication. Key files:
- `apps/web/lib/auth/client.ts` - Client-side auth hook
- `apps/web/lib/auth/server.ts` - Server-side auth utilities
- `apps/web/lib/auth/get-session.ts` - `getAuthContext()` — returns `{ userId, organizationId, user }`
- `apps/web/app/api/auth/[...path]/route.ts` - Auth API handler
- `apps/web/proxy.ts` - Auth middleware for protected routes

## Database Access

Use Prisma via `@/lib/db` (within `apps/web`) or `@polso/db` (from packages):

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

// In server actions or queries — always scope by organizationId
const { organizationId } = await getAuthContext()
const accounts = await prisma.account.findMany({
  where: { organizationId }
})
```

Schema lives at `packages/db/prisma/schema.prisma`. Run `pnpm --filter @polso/db db:generate` after schema changes.

## Configuration

- **`apps/web/components.json`**: Shadcn/ui config with `radix-lyra` style, zinc base color
- **`packages/db/prisma.config.ts`**: Prisma configuration
- **`turbo.json`**: Task pipeline — `build` depends on `^build` and `^db:generate`
- **ESLint**: Flat config format (v9) with Next.js core-web-vitals rules
- **TypeScript**: Strict mode, bundler module resolution, shared via `@polso/tsconfig`

## Environment Variables

Required environment variables (see `apps/web/.env.example`):

```env
DATABASE_URL              # Neon PostgreSQL connection string
NEON_AUTH_BASE_URL        # Neon Auth endpoint
R2_ENDPOINT               # Cloudflare R2 endpoint
R2_ACCESS_KEY_ID          # R2 credentials
R2_SECRET_ACCESS_KEY      # R2 credentials
R2_BUCKET_NAME            # R2 bucket name
TINK_CLIENT_ID            # Tink API client ID
TINK_CLIENT_SECRET        # Tink API client secret
TINK_REDIRECT_URI         # Tink Link redirect URI (e.g. https://app.polso.com/api/tink/callback)
CRON_SECRET               # Secret for cron job authentication
NEXT_PUBLIC_APP_URL       # Application URL
RESEND_API_KEY            # Resend email API key
CREEM_API_KEY             # Creem billing API key
```

## Code Generation Rules

**Code patterns reference**: See `docs/CODE_PATTERNS.md` for full annotated templates of every pattern below.

### Server Actions
- File: `apps/web/features/<module>/actions/<verb>-<entity>.ts`
- Always start with `"use server"` directive
- First line in try block: `const { organizationId } = await getAuthContext()`
- Return type: `Promise<ActionResponse<T>>` using `successResponse()` / `errorResponse()`
- Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `DUPLICATE_ERROR`, `ERROR`
- Always `revalidatePath()` after mutations (feature route + `/dashboard`)
- Function naming: `verbEntityAction()` — e.g., `updateExpenseAction`, `createCategoryAction`
- Bulk actions: `bulkUpdateEntityFieldAction(ids: string[], value: T)`
- Define input/result interfaces locally in the file, not in shared types

### Queries
- File: `apps/web/features/<module>/queries/get-<entity>.ts`
- Export typed interfaces: `EntityWithRelations`, `EntityFilters`, `EntityStats`
- Always filter by `organizationId` first
- Use `Promise.all()` for parallel queries (data + count)
- Relations: always use `include` with explicit `select` — never include all fields
- Stats: use `.aggregate()` with `_sum`, `_count`
- Named exports only (no default exports)

### Components
- File: `apps/web/features/<module>/components/<entity>-<type>.tsx`
- `"use client"` for interactive components
- Use `useTranslations("namespace")` for i18n (client) or `getTranslations` (server)
- Icons: `@phosphor-icons/react` (client) or `@phosphor-icons/react/dist/ssr` (server)
- Table components: checkbox selection, row click → Sheet edit, bulk action bar
- Sheet edit pattern: `selectedEntity` state, `handleRowClick`, `handleSave` with `router.refresh()`
- Filter components: read from props (searchParams), update URL via `router.push()`, debounce search 300ms, reset page on filter change
- Form fields: wrap in `<div className="space-y-2"><Label>...</Label><Control /></div>`
- Named exports for components, no default exports

### Pages
- File: `apps/web/app/(dashboard)/<route>/page.tsx`
- Server components (no "use client")
- Props: `{ searchParams: Promise<{ page?: string; ... }> }`
- Use `await getTranslations("namespace")` for translations
- Parallel data fetching with `Promise.all([])`
- Layout: `<div className="flex flex-col gap-6 p-6">` → title → stats grid → filters → Card with table

### i18n
- Files: `apps/web/messages/{en,es}/<namespace>.json`
- One file per feature namespace matching the feature directory name
- Nested keys: `table.*`, `fields.*`, `bulk.*`, `pagination.*`, `editSheet.*`
- Interpolation: `{count}`, `{start}`, `{end}`, `{total}`
- Common keys in `messages/{en,es}/common.json`
- Register new namespaces in `apps/web/lib/i18n/messages.ts`

### Naming Conventions
- Files: kebab-case always (`expense-table.tsx`, `get-expenses.ts`)
- Components: PascalCase exports (`ExpenseTable`)
- Functions: camelCase exports (`updateExpenseAction`, `getExpenses`)
- Routes: plural nouns (`/expenses`, `/incomes`, `/vendors`)
- Feature dirs: `features/<plural>/` matching existing pattern

### UI Rules
- Always use Shadcn/ui components — query shadcn MCP before creating custom ones
- Import from `@polso/ui/<kebab-case>` (e.g. `@polso/ui/button`, `@polso/ui/sheet`)
- Badge variants: `default` (positive), `outline` (neutral), `secondary` (muted), `destructive` (error)
- Buttons: `variant="ghost" size="sm"` for toolbar actions
- Loading state: `<Spinner className="h-4 w-4 animate-spin" />` from Phosphor icons
- Sheet footer: `<SheetFooter className="mt-auto p-0">` with Cancel (outline) + Save (default)

## Workflow Rules

### Planning
- Enter plan mode for any task with 3+ steps or architectural decisions
- If something goes wrong mid-implementation, STOP and re-plan
- Write a verification plan before starting, not just after

### Verification
- Never mark a task complete without proving it works
- Run `pnpm build` to check types after any code change
- Use preview tools to verify UI changes visually
- Ask: "Would a staff engineer approve this PR?"

### Simplicity
- Make every change as simple as possible with minimal code impact
- Find root causes — no temporary fixes
- Only touch what's necessary to avoid introducing bugs
- Skip elegance optimization for simple/obvious fixes

### Commits & Shipping
- **Granular commits** — one commit per concern. Never bundle unrelated changes.
- **Format**: `type: :emoji: description` (lowercase, imperative mood)
- **Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `perf`
- **Examples** (from this repo):
  - `feat: :sparkles: Add expense edit sheet and bulk actions`
  - `fix: :bug: Fix stale /banking route references causing infinite loading`
  - `refactor: :truck: Rename /income route to /incomes to match /expenses pattern`
  - `docs: :memo: Add code generation patterns and workflow rules`

**Multi-layer features must be split into commits by layer.** When a feature touches more than one of the layers below, create a separate commit for each layer that has changes:

| Layer | What belongs here |
|-------|-------------------|
| `schema` | `packages/db/prisma/schema.prisma` only |
| `backend` | `apps/web/features/*/lib/`, `features/*/queries/`, `features/*/actions/` |
| `frontend` | `apps/web/features/*/components/`, `app/(dashboard)/*/page.tsx`, `messages/*/[feature].json`, `lib/i18n/messages.ts` |
| `navigation` | `apps/web/components/layout/app-sidebar.tsx`, `messages/*/common.json` |
| `settings` | `apps/web/features/settings/**`, `messages/*/settings.json` |
| `infra` | `apps/web/app/api/cron/`, `vercel.json`, config files |

Example for a full feature like Alerts:
1. `chore: :card_file_box: Add NotificationSetting alert fields to schema` — schema only
2. `feat: :brain: Add alert detection logic, queries, and actions` — backend layer
3. `feat: :bell: Add alerts UI (page, components, i18n)` — frontend layer
4. `feat: :compass: Add Alerts to sidebar navigation` — navigation layer
5. `feat: :gear: Add alert type toggles to notification settings` — settings layer
6. `feat: :alarm_clock: Add detect-alerts cron endpoint` — infra layer

**⚠️ MANDATORY pre-push gate — never push without reviewing:**
1. Run `/review` on the changes (staged, unstaged, or last commit)
2. Fix any **Error** or **Warning** findings before proceeding
3. Only then push to remote

Use `/ship` to run the full review → commit → push flow automatically.

### Self-Correction
- After any correction from the user, note the pattern to avoid repeating it
- Review existing patterns in the codebase before generating new code
- When unsure, read the analogous existing implementation first
