# Tech Debt — Production Readiness Audit

Audit date: **2026-06-12**. Five parallel reviews (infra/config, security, billing, bank sync + messaging agent, incomplete code) plus manual verification of every critical claim. `pnpm build` passes.

Status legend: ✅ fixed (2026-06-12) · ⏳ pending · ❌ false alarm (verified against code — do not re-report)

---

## 1. Billing (Creem) — biggest gap, blocks charging customers

| Status | Finding | Where |
|--------|---------|-------|
| ⏳ | No checkout/upgrade UI or action — `createCreemCheckout()` and `cancelCreemSubscription()` have no callers. Users cannot pay or cancel from the app. | `packages/billing/src/creem-client.ts` |
| ⏳ | Webhook has no idempotency — a Creem retry processes the same event twice. No processed-event table. | `apps/web/app/api/webhooks/creem/route.ts` |
| ⏳ | `payment_failed` event not in `CreemEventType` and not handled — failed cards leave the subscription "active" in DB. | `creem/route.ts:11-18` |
| ⏳ | Org-not-found / unknown product_id paths log + return **200** — Creem never retries, org never updates. Should return 4xx/5xx as appropriate. | `creem/route.ts` handlers |
| ⏳ | `trialEndsAt` exists in schema but nothing populates it at signup — trials never start. | `packages/db/prisma/schema.prisma:33` |
| ⏳ | Subscription expiry → instant downgrade to starter, no grace period or warning emails. | `features/billing/actions/sync-subscription.ts` (`handleSubscriptionExpired`) |
| ⏳ | Webhook signature compared with `===` instead of `timingSafeEqual`. 5-minute fix. | `creem/route.ts:73` |
| ⏳ | No event timestamp validation (replay window). | `creem/route.ts` |
| ✅ | `getProductId()` now throws a clear error when the product ID env var is missing (was `?? ""` → opaque Creem 400). | `packages/billing/src/creem-client.ts` |
| ❌ | "Plan limits not enforced" — false. `requireLimit()` is enforced before bank connect and team invites. | `features/billing/lib/require-limit.ts` |

## 2. Database

| Status | Finding | Where |
|--------|---------|-------|
| ⏳ | No versioned Prisma migrations — only `db:push`. No rollback path; push can be destructive in prod. Baseline with `prisma migrate` before launch. | `packages/db/prisma/` |
| ✅ | `DATABASE_URL` now fails fast with a clear error instead of `process.env.DATABASE_URL!`. | `packages/db/src/client.ts` |

## 3. Observability

| Status | Finding | Where |
|--------|---------|-------|
| ⏳ | No error monitoring (Sentry or similar). Cron failures are invisible — sync could silently stop for days. | repo-wide |
| ⏳ | ~170 `console.log`/`console.error` in webhooks/crons log org IDs, emails, subscription details. Replace with structured logging or scrub sensitive fields. | `creem/route.ts` (19), `cron/sync-transactions` (14), partner `cron/daily` (11), others |

## 4. Bank sync (GoCardless)

| Status | Finding | Where |
|--------|---------|-------|
| ✅ | `getAccountDetails()` swallowed every error (`catch { return null }`) — 429/auth/5xx looked identical to "account deleted". Now returns null only on 404, propagates the rest; the OAuth callback degrades explicitly with a logged warning. | `packages/banking/src/gocardless-client.ts`, `apps/web/app/api/gocardless/callback/route.ts` |
| ✅ | `getInstitution()` failure now logs a warning (still degrades to null — display metadata only). | `gocardless-client.ts` |
| ⏳ | `sync-transactions` cron: no `export const maxDuration`, processes orgs sequentially. Vercel timeout truncates the run as account count grows. Needs maxDuration + batching/cursor. | `apps/web/app/api/cron/sync-transactions/route.ts` |
| ⏳ | Consent expiry notifies via in-app alert only (`detectSyncErrorAlerts`); no proactive email/WhatsApp/Telegram to the end user. Partner reconnect message exists but is manual. | `features/alerts/lib/detect-alerts.ts`, partner `send-bank-reconnect.ts` |
| ⏳ | Transaction upsert `findFirst`+`create` has a race under concurrent syncs — P2002 is caught for entries but not for the transaction upsert. Mitigated by the org-level Redis sync lock; only matters if Redis is down. | `features/banking/lib/sync-core.ts` |
| ❌ | "No typed errors / no rate-limit handling / no retry" — false (stale audit). Client has `GCApiError`/`GCRateLimitError`, Retry-After parsing, one 5xx retry on GETs; sync-core sets per-account cooldowns on 429 and never strikes rate-limited accounts. | `gocardless-client.ts`, `sync-core.ts` |
| ❌ | "Sandbox endpoint hardcoded to prod" — GoCardless Bank Account Data has a single production host; sandbox is selected via sandbox institution IDs, not a separate base URL. Not a launch blocker. | `gocardless-client.ts:29` |
| ❌ | "Duplicate transactions on cron re-run" — false. Idempotent upsert + `@@unique([accountId, externalTransactionId])` + org-level sync lock. | `sync-core.ts`, `schema.prisma` |

## 5. Messaging agent (WhatsApp / Telegram / OCR / AI cost)

| Status | Finding | Where |
|--------|---------|-------|
| ✅ | `runAgent()` (Sonnet, `maxSteps: 8`) had no token cap — now `maxTokens: 2000` per step (~16K/run worst case). | `features/agent/lib/run-agent.ts` |
| ✅ | OCR accepted any file size — now rejects images >5MB / PDFs >25MB with typed `FileTooLargeError` before base64 expansion; both webhooks reply with a specific user message. | `packages/agent/src/ocr.ts`, whatsapp/telegram webhook routes |
| ✅ | `checkAiRateLimit()` threw on Redis outage, crashing every AI endpoint — now fails open with a logged error. | `packages/cache/src/ai-rate-limit.ts` |
| ⏳ | `generateProactiveMessage()` call in partner daily cron has no try-catch/fallback — an Anthropic outage kills the cron run. | `apps/partner/app/api/cron/daily/route.ts:~140` |
| ⏳ | WhatsApp connect button shows "Available soon" — decide: ship hidden or finish it. | `features/settings/components/agent-connections-card.tsx:194` |
| ❌ | "Webhook signatures weak" — false. Telegram uses `timingSafeEqual`, WhatsApp uses a constant-time XOR loop, both fail closed when the secret env var is missing. | webhook routes |

## 6. Security

| Status | Finding | Where |
|--------|---------|-------|
| ⏳ | `/api/profile-image/[userId]` has **no auth** in either app — anyone can enumerate profile images by userId. (org-logo is public by design; this is not.) | `apps/{web,partner}/app/api/profile-image/[userId]/route.ts` |
| ⏳ | `getTransactions()` accepts an optional `organizationId` param no caller uses — latent IDOR. Remove the param or validate ownership. | `features/transactions/queries/get-transactions.ts:45` |
| ⏳ | No request-level rate limiting on public webhook endpoints (signature-validated, but unlimited volume). | webhook routes |
| ⏳ | Cron endpoints: bearer secret only — no IP allowlist or replay protection. Low priority. | cron routes |
| ❌ | Multi-tenancy IDOR between partners — false. Every partner query/action verifies the `partnerClient` link before touching client data. | `apps/partner/features/*` |
| ❌ | Hardcoded secrets in source — none found. | repo-wide |

## 7. Configuration / environment

| Status | Finding | Where |
|--------|---------|-------|
| ✅ | `.env.example` was missing 11 vars used by code (Upstash ×2, Anthropic ×2, WhatsApp ×4, Telegram ×2, `PUBLIC_SIGNUP_ENABLED`) — now complete. | `.env.example` |
| ✅ | `turbo.json` `passThroughEnv` synced with code: removed legacy `TINK_*`, `VITE_NEON_AUTH_URL`, `NEON_PROJECT_ID`, `R2_TOKEN_VALUE`, generic `ANTHROPIC_API_KEY`; fixed `NEXT_PUBLIC_PARTNER_URL` → `NEXT_PUBLIC_PARTNER_APP_URL`; added `GOCARDLESS_*`, `UPSTASH_*`, `ANTHROPIC_API_KEY_{CHAT,OCR}`, `PUBLIC_SIGNUP_ENABLED`. | `turbo.json` |
| ✅ | Silent `process.env.X!` assertions replaced with clear fail-fast errors: R2 (lazy client), Telegram token, WhatsApp creds, `DATABASE_URL`, Creem product IDs. | `packages/{storage,agent,db,billing}` |
| ⏳ | No centralized env validation (zod/t3-env) — the per-package checks above cover the critical paths; a schema-validated env would catch the rest at boot. | repo-wide |
| ⏳ | Email templates build URLs from `NEXT_PUBLIC_APP_URL` without checking it's set (`//dashboard` if empty). | `packages/email/src/send.ts` |

## 8. Minor

| Status | Finding | Where |
|--------|---------|-------|
| ⏳ | `apps/partner` has no `global-error.tsx` (web does). | `apps/partner/app/` |
| ⏳ | Partner export: DB record created via fire-and-forget `.then().catch(console.error)` — download succeeds but history can silently miss entries. | `apps/partner/app/api/export/route.ts:74-95` |
| ⏳ | Partner cron digests have no same-day dedup — a manual re-trigger sends duplicate emails. | `apps/partner/app/api/cron/daily/route.ts` |

## False alarms — verified, do not re-report

- **`vercel.json` missing** — exists in both `apps/web` and `apps/partner`.
- **`.env` committed / CRON_SECRET exposed** — `.env*` is gitignored and no `.env` file is tracked.
- **i18n incomplete** — en/es key sets match; all sidebar routes exist (`/analytics` → `/reports` redirect is intentional).
- **GoCardless client lacks error typing/retries** — see §4; the audit snapshot was stale.
- **Plan limits display-only** — enforced at bank connect and team invite.
- **Partner→client IDOR** — partnerClient link checked everywhere sampled.
