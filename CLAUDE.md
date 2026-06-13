# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Each app, package, **and feature module** has its own `CLAUDE.md` with scoped instructions — Claude will load the root file plus the relevant subdirectory file automatically.

**⚠️ Feature doc rule:** every `apps/{web,partner}/features/<name>/` has a `CLAUDE.md`. Any change to a feature's code must update its `CLAUDE.md` in the same commit when the change affects what the doc states (files, flows, models, integration points). Enforced three ways: `/review` checklist, `/create-feature` scaffolds it, and a pre-push hook blocks `git push` when a feature changed without its doc (bypass: include "docs-ok" in a commit message when the doc is genuinely unaffected).

## Project Overview

Polso is a financial management and expense intelligence SaaS for businesses. Connects to banks via GoCardless Bank Account Data (Open Banking), syncs transactions, auto-categorizes spending, detects recurring expenses, and provides analytics.

**pnpm + Turborepo monorepo.** Two apps, sixteen shared packages.

- Architecture & schema: `docs/ARCHITECTURE.md`
- Code templates: `docs/CODE_PATTERNS.md`
- Receipt matching lifecycle (no_match, deferred reconciliation, gaps): `docs/RECEIPT_MATCHING_FLOW.md`
- Vendor/counterparty matching audit & redesign plan (ingestion fragmentation, merge dedup): `docs/VENDOR_MATCHING_AUDIT.md`
- Production-readiness audit & pending debt: `docs/TECH_DEBT.md`

## Monorepo Structure

```
apps/
  web/           @polso/web      Next.js 16 client dashboard (see apps/web/CLAUDE.md)
  partner/       @polso/partner  Next.js 16 advisor dashboard (see apps/partner/CLAUDE.md)
packages/
  accounting/    @polso/accounting  Spanish PGC double-entry journal lines, A3/Sage export formats
  agent/         @polso/agent    WhatsApp + Telegram bot + OCR extraction + proactive messages
  auth/          @polso/auth     Neon Auth helpers (getAuthContext, server/client, consent)
  banking/       @polso/banking  GoCardless Bank Account Data client
  billing/       @polso/billing  Creem payment integration
  cache/         @polso/cache    Upstash Redis client, cache helpers, AI rate limiting
  db/            @polso/db       Prisma schema, client, generated types
  email/         @polso/email    Resend + email templates
  inbox/         @polso/inbox    Shared receipt processing core (OCR pipeline, stuck-item recovery)
  intelligence/  @polso/intelligence  Auto-categorization, recurring detection
  matching/      @polso/matching Receipt↔transaction matching algorithm
  plans/         @polso/plans    Plan limits, pricing, feature flags
  storage/       @polso/storage  Cloudflare R2 client
  tsconfig/      @polso/tsconfig Shared TypeScript configs
  ui/            @polso/ui       Shadcn/ui component library
  utils/         @polso/utils    cn(), ActionResponse, shared enums
```

## Commands

```bash
pnpm dev                              # Start everything (turbo)
pnpm build                            # Build all packages + apps
pnpm lint                             # Lint all

pnpm --filter @polso/web dev          # Web app only (port 3000)
pnpm --filter @polso/partner dev      # Partner app only (port 3001)
pnpm --filter @polso/db db:generate   # Generate Prisma client
pnpm --filter @polso/db db:push       # Push schema to database
pnpm --filter @polso/db db:migrate    # Create + apply migration
pnpm --filter @polso/db db:seed       # Seed database
```

## Monorepo Rules

- Packages link via `workspace:*` in `package.json`
- All `@polso/*` packages are raw TypeScript (no build step) — must be listed in `transpilePackages` in **both** `apps/web/next.config.ts` and `apps/partner/next.config.ts`
- Tailwind v4 requires `@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}"` in each app's `globals.css` to scan UI component classes
- Adding a package: create `packages/<name>/`, add `package.json` with `@polso/<name>`, add to `transpilePackages` in both apps
- `turbo.json` pipeline: `build` depends on `^build` + `^db:generate`

## UI Components

**Always use Shadcn/ui.** Query the **shadcn MCP server** before creating any custom component.

- Install: `pnpm dlx shadcn@latest add <component-name>` (installs to `apps/web`, then move to `packages/ui/`)
- Style: `radix-lyra`, Phosphor icons, Tailwind CSS v4
- **Never override component shape or spacing.** Do not add `rounded-*`, `px-*`, `h-*`, `w-*`, or similar overrides to `<Button>`, `<Badge>`, `<Input>`, or other UI primitives. The design system defines these — overriding them breaks visual consistency. Pass only `variant` and `size` props.

## Workflow Rules

### Planning
- Enter plan mode for any task with 3+ steps or architectural decisions
- Stop and re-plan if something goes wrong mid-implementation

### Verification
- Run `pnpm build` after any code change to catch type errors
- Never mark a task complete without proving it works

### Simplicity
- Minimal code impact — only touch what's necessary
- Find root causes, no temporary fixes

### Self-Correction
- After any correction, note the pattern to avoid repeating it
- Read the analogous existing implementation before generating new code

## Commits & Shipping

**Format:** `type: :emoji: description` (lowercase, imperative)
**Types:** `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `perf`

**Multi-layer features:** split into one commit per layer:

| Layer | What belongs here |
|-------|-------------------|
| `schema` | `packages/db/prisma/schema.prisma` only |
| `backend` | `features/*/lib/`, `*/queries/`, `*/actions/` (either app) |
| `frontend` | `features/*/components/`, `app/(dashboard)/*/page.tsx`, `messages/` (web only) |
| `navigation` | `components/layout/app-sidebar.tsx`, `messages/*/common.json` |
| `settings` | `features/settings/**` |
| `infra` | `app/api/cron/`, `vercel.json`, config files |

**⚠️ Pre-push gate:** Run `/review` on all changes. Fix every Error and Warning before pushing.

Use `/ship` to run the full review → commit → push flow automatically.
