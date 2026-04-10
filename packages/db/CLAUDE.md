# packages/db — @polso/db

Prisma 7 schema, client singleton, and generated types. Database: Neon PostgreSQL (serverless). Adapter: `@prisma/adapter-neon`.

## What it exports

```typescript
prisma           // PrismaClient singleton — use this everywhere
PrismaClient     // type only
Prisma           // namespace — Prisma.ExpenseWhereInput, Prisma.SortOrder, etc.

// All 18 model types (re-exported from generated client)
Organization, UserOrganization, Account, Transaction, Category,
CategoryPreference, Vendor, Client, Expense, Income, ExpenseInvoice,
RecurringPattern, Alert, Export, UserPreference, NotificationSetting,
DismissedPattern, Invitation
```

## Schema

Lives at `packages/db/prisma/schema.prisma`. 18 models across 6 domains — see `docs/ARCHITECTURE.md` for the full table.

**Multi-tenancy rule**: every query must filter by `organizationId`. This is the root of all data.

## Commands

```bash
pnpm --filter @polso/db db:generate   # regenerate Prisma client after schema changes
pnpm --filter @polso/db db:push       # push schema to DB (dev, no migration file)
pnpm --filter @polso/db db:migrate    # create + apply migration file
pnpm --filter @polso/db db:seed       # seed reference data (system categories, etc.)
```

## After schema changes

1. Run `db:generate` — regenerates `src/generated/`
2. Turbo's `build` task depends on `^db:generate`, so CI handles ordering automatically
3. `src/generated/` is gitignored — it's regenerated on `postinstall`

## Gotcha

The generated client at `src/generated/prisma/` is **gitignored**. If you see type errors after cloning or switching branches, run `pnpm --filter @polso/db db:generate` (or just `pnpm install` which triggers postinstall).

## Usage in apps/web

```typescript
import { prisma } from "@/lib/db"  // shim → @polso/db
// or directly:
import { prisma } from "@polso/db"
```

Prefer `@polso/db` for new code. Both work.
