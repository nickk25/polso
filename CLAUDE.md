# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polso is a financial management and expense intelligence SaaS platform for businesses. It connects to banks via Open Banking APIs, syncs transactions, detects recurring expenses, auto-categorizes spending, and provides analytics (burn rate, runway, cash flow).

**Architecture documentation**: See `docs/ARCHITECTURE.md` for full database schema, feature modules, and implementation details.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Full-stack React framework with App Router |
| **Prisma 7** | ORM for database access |
| **Neon PostgreSQL** | Serverless Postgres database |
| **Neon Auth** | Authentication (built on Better Auth) |
| **Cloudflare R2** | Object storage for invoices and exports |
| **Plaid** | Bank account connections (Link + Transactions API) |
| **Shadcn/ui** | UI components (Radix primitives) |
| **Tailwind CSS v4** | Styling |

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
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Push schema changes to database
pnpm prisma migrate dev  # Create and apply migrations
```

## Project Structure

```
/app                    # Next.js App Router pages
/components             # React components
/components/ui          # Shadcn UI components
/features               # Feature modules (banking, expenses, etc.)
  /banking
    /actions            # Server actions
    /queries            # Database queries
    /lib                # Feature-specific utilities
/lib
  /auth                 # Neon Auth configuration
  /db                   # Prisma client
  /generated/prisma     # Generated Prisma types
  /storage              # Cloudflare R2 client
  /types                # TypeScript types
/prisma
  /schema.prisma        # Database schema
```

## Architecture

- **App Router**: All routes in `/app` directory, uses React Server Components by default
- **Server Actions**: All mutations use server actions with `"use server"` directive
- **Path Aliases**: Use `@/` for imports (maps to project root)
  - `@/components` - React components
  - `@/components/ui` - Shadcn UI components
  - `@/lib/db` - Prisma client
  - `@/lib/auth` - Neon Auth utilities
  - `@/lib/types` - TypeScript types (re-exports Prisma types)
  - `@/lib/utils` - Utility functions (cn helper for class merging)
  - `@/features` - Feature modules
- **Styling**: Tailwind CSS with CSS custom properties for theming (oklch color space, light/dark mode)
- **Fonts**: JetBrains Mono (primary), Geist Sans and Geist Mono via next/font

## Authentication

Neon Auth (Better Auth) handles authentication. Key files:
- `lib/auth/client.ts` - Client-side auth hook
- `lib/auth/server.ts` - Server-side auth utilities
- `lib/auth/get-session.ts` - Get user and organization context
- `app/api/auth/[...path]/route.ts` - Auth API handler
- `proxy.ts` - Auth middleware for protected routes

## Database Access

Use Prisma via `@/lib/db`:

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

// In server actions or queries
const { organizationId } = await getAuthContext()
const accounts = await prisma.account.findMany({
  where: { organizationId }
})
```

## Configuration

- **components.json**: Shadcn/ui config with `radix-lyra` style, zinc base color
- **prisma.config.ts**: Prisma configuration
- **ESLint**: Flat config format (v9) with Next.js core-web-vitals rules
- **TypeScript**: Strict mode enabled, bundler module resolution

## Environment Variables

Required environment variables (see `.env.example`):

```env
DATABASE_URL              # Neon PostgreSQL connection string
NEON_AUTH_BASE_URL        # Neon Auth endpoint
R2_ENDPOINT               # Cloudflare R2 endpoint
R2_ACCESS_KEY_ID          # R2 credentials
R2_SECRET_ACCESS_KEY      # R2 credentials
R2_BUCKET_NAME            # R2 bucket name
PLAID_CLIENT_ID           # Plaid API client ID
PLAID_SECRET              # Plaid API secret
PLAID_ENV                 # Plaid environment (sandbox|development|production)
CRON_SECRET               # Secret for cron job authentication
NEXT_PUBLIC_APP_URL       # Application URL
```

## Code Generation Rules

**Code patterns reference**: See `docs/CODE_PATTERNS.md` for full annotated templates of every pattern below.

### Server Actions
- File: `features/<module>/actions/<verb>-<entity>.ts`
- Always start with `"use server"` directive
- First line in try block: `const { organizationId } = await getAuthContext()`
- Return type: `Promise<ActionResponse<T>>` using `successResponse()` / `errorResponse()`
- Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `DUPLICATE_ERROR`, `ERROR`
- Always `revalidatePath()` after mutations (feature route + `/dashboard`)
- Function naming: `verbEntityAction()` — e.g., `updateExpenseAction`, `createCategoryAction`
- Bulk actions: `bulkUpdateEntityFieldAction(ids: string[], value: T)`
- Define input/result interfaces locally in the file, not in shared types

### Queries
- File: `features/<module>/queries/get-<entity>.ts`
- Export typed interfaces: `EntityWithRelations`, `EntityFilters`, `EntityStats`
- Always filter by `organizationId` first
- Use `Promise.all()` for parallel queries (data + count)
- Relations: always use `include` with explicit `select` — never include all fields
- Stats: use `.aggregate()` with `_sum`, `_count`
- Named exports only (no default exports)

### Components
- File: `features/<module>/components/<entity>-<type>.tsx`
- `"use client"` for interactive components
- Use `useTranslations("namespace")` for i18n (client) or `getTranslations` (server)
- Icons: `@phosphor-icons/react` (client) or `@phosphor-icons/react/dist/ssr` (server)
- Table components: checkbox selection, row click → Sheet edit, bulk action bar
- Sheet edit pattern: `selectedEntity` state, `handleRowClick`, `handleSave` with `router.refresh()`
- Filter components: read from props (searchParams), update URL via `router.push()`, debounce search 300ms, reset page on filter change
- Form fields: wrap in `<div className="space-y-2"><Label>...</Label><Control /></div>`
- Named exports for components, no default exports

### Pages
- File: `app/(dashboard)/<route>/page.tsx`
- Server components (no "use client")
- Props: `{ searchParams: Promise<{ page?: string; ... }> }`
- Use `await getTranslations("namespace")` for translations
- Parallel data fetching with `Promise.all([])`
- Layout: `<div className="flex flex-col gap-6 p-6">` → title → stats grid → filters → Card with table

### i18n
- Files: `messages/{en,es}/<namespace>.json`
- One file per feature namespace matching the feature directory name
- Nested keys: `table.*`, `fields.*`, `bulk.*`, `pagination.*`, `editSheet.*`
- Interpolation: `{count}`, `{start}`, `{end}`, `{total}`
- Common keys in `messages/{en,es}/common.json`

### Naming Conventions
- Files: kebab-case always (`expense-table.tsx`, `get-expenses.ts`)
- Components: PascalCase exports (`ExpenseTable`)
- Functions: camelCase exports (`updateExpenseAction`, `getExpenses`)
- Routes: plural nouns (`/expenses`, `/incomes`, `/vendors`)
- Feature dirs: `features/<plural>/` matching existing pattern

### UI Rules
- Always use Shadcn/ui components — query shadcn MCP before creating custom ones
- Import from `@/components/ui/<kebab-case>`
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
- **Granular commits** — one commit per feature, fix, or refactor. Never bundle unrelated changes.
- **Format**: `type: :emoji: description` (lowercase, imperative mood)
- **Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `perf`
- **Examples** (from this repo):
  - `feat: :sparkles: Add expense edit sheet and bulk actions`
  - `fix: :bug: Fix stale /banking route references causing infinite loading`
  - `refactor: :truck: Rename /income route to /incomes to match /expenses pattern`
  - `docs: :memo: Add code generation patterns and workflow rules`

**⚠️ MANDATORY pre-push gate — never push without reviewing:**
1. Run `/review` on the changes (staged, unstaged, or last commit)
2. Fix any **Error** or **Warning** findings before proceeding
3. Only then push to remote

Use `/ship` to run the full review → commit → push flow automatically.

### Self-Correction
- After any correction from the user, note the pattern to avoid repeating it
- Review existing patterns in the codebase before generating new code
- When unsure, read the analogous existing implementation first
