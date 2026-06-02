# Polso

**Open-source financial management and expense intelligence for small businesses.**

Polso connects to bank accounts via GoCardless Open Banking, syncs transactions automatically, and helps businesses stay on top of their finances — with AI-assisted categorization, receipt matching, recurring expense detection, and a partner portal for accounting advisors.

Built with Next.js 16, Prisma 7, Neon PostgreSQL, and Tailwind CSS v4. Designed to be self-hosted.

---

## What it does

**For businesses (`apps/web`)**
- Connect bank accounts via GoCardless (EU Open Banking — 2,500+ banks)
- Auto-sync transactions daily; manually re-sync at any time
- AI categorization and vendor detection on every transaction
- Upload receipts and invoices; OCR extracts amount, date, and vendor
- Match receipts to transactions automatically (AI-powered)
- Detect recurring expenses and subscriptions
- Cash flow, burn rate, and runway analytics
- Smart alerts: low balance, unusual spending, missed recurring charges
- Quarterly IVA (VAT) tracking for Spanish businesses (Modelo 303)
- ZIP export of transactions + invoices for accountants

**For accounting advisors (`apps/partner`)**
- Private dashboard to manage multiple client businesses
- Per-client transaction coverage, IVA status, and receipt completeness
- Quarterly close readiness view (Modelo 303)
- Send reminders to clients via Telegram or WhatsApp
- Bulk reminder to all clients with pending documentation
- Receive and review client-uploaded receipts

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 — App Router, React Server Components |
| Database | Neon PostgreSQL (serverless) + Prisma 7 |
| Auth | Neon Auth (Better Auth) |
| Open Banking | GoCardless Bank Account Data API |
| File storage | Cloudflare R2 |
| Email | Resend |
| Billing | Creem |
| Messaging | Telegram Bot API, WhatsApp Cloud API |
| AI / OCR | Anthropic Claude API |
| UI | Shadcn/ui + Tailwind CSS v4 + Phosphor Icons |
| Monorepo | pnpm + Turborepo |

---

## Project structure

```
apps/
  web/          Client-facing dashboard (businesses)
  partner/      Advisor portal (accounting firms)
packages/
  agent/        Telegram + WhatsApp bot, OCR extraction
  auth/         Neon Auth session helpers
  banking/      GoCardless Open Banking client
  billing/      Creem payment integration
  db/           Prisma schema, client singleton, generated types
  email/        Resend client + transactional templates
  inbox/        Receipt processing utilities
  intelligence/ Auto-categorization + recurring pattern detection
  matching/     AI-powered receipt ↔ transaction matching
  plans/        Plan limits, pricing, feature flags
  storage/      Cloudflare R2 client
  ui/           Shared Shadcn/ui component library
  utils/        cn(), ActionResponse, shared enums
  tsconfig/     Shared TypeScript configurations
```

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A [Neon](https://neon.tech) PostgreSQL database
- A [GoCardless Bank Account Data](https://gocardless.com/bank-account-data/) account (for bank connections)

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/polso.git
cd polso
pnpm install

# Generate Prisma client
pnpm --filter @polso/db db:generate

# Push schema to your database
pnpm --filter @polso/db db:push

# Seed reference data (system categories)
pnpm --filter @polso/db db:seed

# Copy and fill environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/partner/.env.example apps/partner/.env.local
```

### Environment variables

**`apps/web`**
```env
DATABASE_URL              # Neon PostgreSQL connection string (pooler)
DATABASE_URL_UNPOOLED     # Direct connection (for migrations)
NEON_AUTH_BASE_URL        # Neon Auth endpoint
R2_ENDPOINT               # Cloudflare R2
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
GOCARDLESS_SECRET_ID      # GoCardless Bank Account Data
GOCARDLESS_SECRET_KEY
GOCARDLESS_REDIRECT_URI
RESEND_API_KEY
CREEM_API_KEY             # Billing (optional)
ANTHROPIC_API_KEY_CHAT    # Claude — dashboard assistant (optional)
CRON_SECRET               # Cron job auth header
NEXT_PUBLIC_APP_URL
```

**`apps/partner`**
```env
DATABASE_URL
NEON_AUTH_BASE_URL
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
TELEGRAM_BOT_TOKEN        # Telegram reminders (optional)
ANTHROPIC_API_KEY_OCR     # Claude — receipt OCR + matching (optional)
CRON_SECRET
```

### Run locally

```bash
pnpm dev                              # Start both apps (web: 3000, partner: 3001)
pnpm --filter @polso/web dev          # Web app only
pnpm --filter @polso/partner dev      # Partner app only
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Database schema, package graph, data flows
- [`docs/CODE_PATTERNS.md`](./docs/CODE_PATTERNS.md) — Code templates and conventions for every layer
- [`CLAUDE.md`](./CLAUDE.md) — AI coding assistant instructions (Claude Code)

---

## Contributing

Contributions are welcome. Please open an issue before submitting large changes so we can discuss the approach.

```bash
pnpm build    # Must pass before opening a PR
pnpm lint     # Check for lint errors
```

---

## License

MIT — see [LICENSE](./LICENSE).
