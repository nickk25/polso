# Polso

Financial management and expense intelligence SaaS for businesses. Connects to bank accounts via Tink (Open Banking), syncs transactions automatically, detects recurring expenses, auto-categorizes spending with AI, and provides analytics including burn rate, runway, and cash flow.

## Tech Stack

- **Next.js 16** — App Router, React Server Components
- **Prisma 7 + Neon PostgreSQL** — Serverless database
- **Neon Auth** — Authentication (Better Auth)
- **Tink** — Open Banking (EU/Spain)
- **Cloudflare R2** — Invoice and export storage
- **Resend** — Transactional email
- **Creem** — Billing and subscriptions
- **Shadcn/ui + Tailwind CSS v4** — UI
- **pnpm + Turborepo** — Monorepo

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Fill in DATABASE_URL, NEON_AUTH_BASE_URL, R2_*, TINK_*, etc.

# Generate Prisma client
pnpm --filter @polso/db db:generate

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Packages

| Package | Description |
|---------|-------------|
| `@polso/banking` | Tink Open Banking client and token management |
| `@polso/billing` | Creem payment API integration |
| `@polso/db` | Prisma schema, client singleton, generated types |
| `@polso/email` | Resend email client and 20 transactional templates |
| `@polso/intelligence` | Auto-categorization and recurring pattern detection |
| `@polso/plans` | Plan definitions, limits, pricing, and feature flags |
| `@polso/storage` | Cloudflare R2 client (upload, download, presigned URLs) |
| `@polso/tsconfig` | Shared TypeScript configs (base, next, library) |
| `@polso/ui` | 26 Shadcn/ui components and hooks |
| `@polso/utils` | `cn()`, `ActionResponse`, shared enums |

## Project Structure

```
polso-monorepo/
  apps/
    web/          Next.js dashboard app
  packages/
    banking/      @polso/banking
    billing/      @polso/billing
    db/           @polso/db
    email/        @polso/email
    intelligence/ @polso/intelligence
    plans/        @polso/plans
    storage/      @polso/storage
    tsconfig/     @polso/tsconfig
    ui/           @polso/ui
    utils/        @polso/utils
```

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — AI coding assistant instructions and conventions
- [`docs/CODE_PATTERNS.md`](./docs/CODE_PATTERNS.md) — Annotated code templates for every pattern
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Database schema, feature modules, data flows
