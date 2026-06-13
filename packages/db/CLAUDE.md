# packages/db — @polso/db

Prisma 7 schema, client singleton, and generated types. Database: Neon PostgreSQL (serverless). Adapter: `@prisma/adapter-neon`.

## What it exports

```typescript
prisma           // PrismaClient singleton — use this everywhere
PrismaClient     // type only
Prisma           // namespace — Prisma.TransactionWhereInput, Prisma.SortOrder, etc.

// Query helpers
transactionDocumentedWhere      // Prisma where: entry verified OR has an inbox item
transactionNotDocumentedWhere   // inverse — transactions still needing a receipt
getPartnerNotificationEmail(partnerOrgId)  // → PartnerRecipient | null
PartnerRecipient                // type — { email, name }

// 16 model types re-exported from the generated client
Organization, UserOrganization, Account, Transaction, TransactionDocument,
Category, CategoryPreference, Counterparty, Entry, RecurringPattern,
Alert, Export, UserPreference, NotificationSetting, DismissedPattern, Invitation
```

Other model types (`PartnerClient`, `InboxItem`, `MatchSuggestion`, `TransactionAttachment`, etc.) exist in the schema but are not re-exported — add them to `src/index.ts` if an app needs them as standalone types.

## Schema

Lives at `packages/db/prisma/schema.prisma`. 28 models — see `docs/ARCHITECTURE.md` for the full table.

**Partner domain**: `Organization.type` ("partner" | "client"), `PartnerClient` (many-to-many link), `InboxItem` (receipts/invoices), `MatchSuggestion` (scored receipt↔transaction candidates), `TransactionAttachment` (confirmed matches).

**Multi-tenancy rule**: every query must filter by `organizationId`. This is the root of all data.

**Counterparty identity fields** (vendor-matching redesign, see `docs/VENDOR_MATCHING_AUDIT.md`): `normalizedName` holds the canonical match-key from `canonicalize()` (`@polso/banking`); `iban` is a hard identity discriminator for transfers; `seenLocations` keeps stripped city tokens as metadata; `mergedFrom` is the reverse-map for merge auditing/undo. `Transaction.counterpartyIban` carries the beneficiary IBAN from sync.

## Environment variables

```env
DATABASE_URL   # required — src/client.ts throws at import time if missing
```

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
