# Architecture

## Package Dependency Graph

```
@polso/web (apps/web — Next.js app)
  ├── @polso/banking       Tink Open Banking client
  ├── @polso/billing       Creem payment API
  │     └── @polso/plans   Plan limits & pricing
  ├── @polso/db            Prisma schema, client, generated types
  ├── @polso/email         Resend + 20 email templates
  ├── @polso/intelligence  Auto-categorization, recurring detection
  │     ├── @polso/banking
  │     └── @polso/db
  ├── @polso/plans         Plan definitions (leaf — no workspace deps)
  ├── @polso/storage       Cloudflare R2 client
  ├── @polso/ui            26 Shadcn/ui components
  │     └── @polso/utils
  └── @polso/utils         cn(), ActionResponse, shared enums (leaf)

@polso/tsconfig            Shared TS configs (dev dependency of all packages)
```

All packages export raw TypeScript (no build step). Next.js `transpilePackages` in `apps/web/next.config.ts` handles compilation.

---

## Database Schema

Prisma schema lives at `packages/db/prisma/schema.prisma`. Database: Neon PostgreSQL (serverless). ORM: Prisma 7 with `@prisma/adapter-neon`.

**Multi-tenancy**: Every query must filter by `organizationId`. This is the root of all data.

### Multi-tenant

| Model | Table | Key Fields |
|-------|-------|------------|
| `Organization` | `organizations` | `plan`, `subscriptionStatus`, `currency`, `timezone`, `fiscalYearStart` |
| `UserOrganization` | `user_organizations` | `userId`, `organizationId`, `role` — unique on `[userId, organizationId]` |
| `Invitation` | `invitations` | `email`, `token`, `role`, `status`, `expiresAt` — team invites via Resend |

### Banking

| Model | Table | Key Fields |
|-------|-------|------------|
| `Account` | `accounts` | `tinkCredentialId`, `accessToken`, `refreshToken`, `status` (pending/active/expired/error), `balance` |
| `Transaction` | `transactions` | `externalTransactionId`, `amount`, `date`, `type` (debit/credit), `merchantName`, `category` (from provider) — unique on `[accountId, externalTransactionId]` |

### Classification

| Model | Table | Key Fields |
|-------|-------|------------|
| `Category` | `categories` | `slug`, `color`, `icon`, `expenseType`, `isSystem`, `parentId` (hierarchical) — unique on `[organizationId, slug]` |
| `CategoryPreference` | `category_preferences` | `organizationId`, `categoryId`, `isVisible` — composite PK |
| `Vendor` | `vendors` | `normalizedName`, `detectionPatterns[]`, `defaultCategoryId`, `defaultExpenseType` — unique on `[organizationId, normalizedName]` |
| `Client` | `clients` | `normalizedName`, `detectionPatterns[]` — income source equivalent of Vendor |

### Finance

| Model | Table | Key Fields |
|-------|-------|------------|
| `Expense` | `expenses` | `transactionId` (1:1 optional), `categoryId`, `vendorId`, `expenseType` (fixed/variable), `status` (pending/documented/excluded), `categorySource`, `categoryConfidence` |
| `Income` | `incomes` | `transactionId` (1:1 optional), `categoryId`, `clientId`, `source` (salary/freelance/investment/refund/transfer/other) |
| `ExpenseInvoice` | `expense_invoices` | `filePath` (R2 object key), `invoiceNumber`, `invoiceDate`, `vendorTaxId`, `totalAmount` |

### Intelligence

| Model | Table | Key Fields |
|-------|-------|------------|
| `RecurringPattern` | `recurring_patterns` | `frequency`, `expectedAmount`, `amountVariancePct`, `confidenceScore`, `isConfirmed`, `nextExpectedDate` |
| `DismissedPattern` | `dismissed_patterns` | Prevents re-detection of patterns the user dismissed |
| `Alert` | `alerts` | `type` (low_balance/high_expense/missed_recurring/unusual_activity/runway_warning), `severity` (info/warning/critical), `isRead`, `isDismissed` |

### System

| Model | Table | Key Fields |
|-------|-------|------------|
| `Export` | `exports` | `filePath` (R2), `dateFrom`, `dateTo`, `expenseCount`, `status` (pending/processing/completed/failed) |
| `UserPreference` | `user_preferences` | `theme`, `locale`, `compactMode` — one per user |
| `NotificationSetting` | `notification_settings` | Granular email toggles + thresholds (`lowBalanceThreshold`, `highExpenseThreshold`, etc.) |

---

## Feature Modules

All features live under `apps/web/features/`. The canonical reference implementation is `expenses/`.

| Feature | Purpose |
|---------|---------|
| `banking/` | Bank connection via Tink Link, account management, transaction sync cron |
| `expenses/` | Expense list, categorization, invoice upload, bulk actions — **canonical example** |
| `income/` | Income list, source classification |
| `analytics/` | Burn rate, runway, cash flow charts, KPI cards |
| `categories/` | Category CRUD, system vs custom, color/icon |
| `vendors/` | Vendor detection, merging, default category assignment |
| `clients/` | Income source (client) management |
| `intelligence/` | Trigger auto-categorization, detect/confirm recurring patterns |
| `recurring/` | Recurring pattern list, confirm/dismiss UI |
| `alerts/` | Alert list, read/dismiss actions |
| `export/` | Generate and download ZIP (invoices + CSV/PDF) |
| `billing/` | Upgrade prompts, plan check, Creem checkout flow |
| `settings/` | Organization, profile, banking, notifications, preferences |
| `team/` | Member list, invite flow, role management |

Each feature directory follows this structure:
```
features/<module>/
  actions/    # Server actions ("use server") — mutations
  queries/    # Plain async functions — read-only data fetching
  components/ # Client + server React components
  lib/        # Feature-specific utilities (optional)
```

---

## Auth Flow

Authentication uses **Neon Auth** (built on Better Auth).

```
Request
  └── proxy.ts (Next.js middleware)
        └── checks session via neonAuth()
              ├── authenticated → continue to route
              └── unauthenticated → redirect /auth/sign-in

Server Action / Query
  └── getAuthContext()  (lib/auth/get-session.ts)
        └── returns { userId, organizationId, user }
              └── organizationId used as multi-tenant scope on every DB query
```

Key files:
- `apps/web/proxy.ts` — middleware, protects all `/` routes except `/auth` and `/api/auth`
- `apps/web/lib/auth/server.ts` — `neonAuth()` server helper
- `apps/web/lib/auth/client.ts` — `useSession()` client hook
- `apps/web/lib/auth/get-session.ts` — `getAuthContext()` used in every action/query
- `apps/web/app/api/auth/[...path]/route.ts` — auth API handler (lazy-init to avoid build crash on missing env)

---

## Data Flow

```
Tink (Open Banking EU)
  │ OAuth flow via TinkLink
  ▼
accounts (connected bank accounts)
  │ cron: /api/cron/sync-transactions
  ▼
transactions (raw bank data)
  │ auto-created for each debit transaction
  ▼
expenses (enriched records)
  │ @polso/intelligence
  ├── category-suggester: keyword rules + vendor defaults → categoryId
  ├── recurring-detector: amount/frequency patterns → RecurringPattern
  └── manual overrides by user (Sheet edit)
  │
  ├── analytics (burn rate, runway, cash flow)
  │     computed on-demand from expenses + incomes
  │
  └── export
        └── @polso/storage (R2): invoices stored, ZIP generated on demand
```

Income transactions follow the same path via `incomes` instead of `expenses`.

---

## Monorepo Configuration

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json` task pipeline
- `db:generate` — runs `prisma generate` in `@polso/db`, no cache
- `build` — depends on `^build` (build deps first) and `^db:generate` (Prisma types must exist)
- `dev` — persistent, no cache
- `lint` — depends on `^build`

### `apps/web/next.config.ts`
All `@polso/*` packages must be listed in `transpilePackages` since they export raw `.tsx`/`.ts` source:
```ts
transpilePackages: [
  "@polso/banking", "@polso/ui", "@polso/utils", "@polso/plans",
  "@polso/db", "@polso/storage", "@polso/email", "@polso/billing", "@polso/intelligence",
]
```

### Tailwind v4 `@source` directive
`apps/web/app/globals.css` includes:
```css
@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}";
```
This tells Tailwind to scan `@polso/ui` component files for utility class names. Required because Turbopack doesn't automatically follow pnpm workspace symlinks for Tailwind scanning. The path points to the pnpm symlink in `node_modules/` which resolves to `packages/ui/src/`.
