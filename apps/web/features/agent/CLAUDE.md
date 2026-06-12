# features/agent

AI financial assistant (Claude via Vercel AI SDK) serving the /dashboard chat surface plus the Telegram/WhatsApp bot channels.

## Files

- `lib/run-agent.ts` — `runAgent()`: non-streaming `generateText` runner (claude-sonnet-4-5, maxSteps 8, maxTokens 2000/step) for Telegram/WhatsApp; persists every run to `ChatLog`
- `lib/context.ts` — `getChatContext()`: builds `ChatContext` (org name, currency, locale, today, firstName) from auth session for the web chat path
- `lib/system-prompt.ts` — `buildSystemPrompt(ctx, opts)`: localized (es/en) system prompt; injects processed-attachment summaries and match instructions
- `lib/process-chat-attachment.ts` — OCR a chat upload (Haiku via `@polso/agent/ocr`, AI rate-limited), dedup by SHA-256 `fileHash`, upload to R2, create `InboxItem`, run matching, classify result (`auto_matched`/`high_confidence`/`suggested_match`/`no_match`)
- `lib/tool-output.ts` — `truncate()` / `pickFields()` helpers to cap tool payloads
- `tools/index.ts` — `buildTools(organizationId?, userId?)`: the live tool set (18 tools, snake_case names) wrapping queries from transactions, categories, counterparties, intelligence, alerts, inbox, banking, analytics features; orgId injected for bot channels, falls back to `getAuthContext()` on web
- `tools/<tool-name>.ts` — standalone single-tool variants (auth-context only); NOT imported by `index.ts` or any route
- `widgets/registry.ts` — zod schemas validating tool results before widget render (`widgetSchemas`)
- `widgets/` — chart/card widgets (cash flow, forecasts, category breakdown, burn/runway, VAT, top counterparties, match suggestion), lazy-loaded
- `components/` — `AgentSurface` (dashboard chat + KPI grid + unread alerts, `useChat` → `/api/chat`), `MessageList`, `MessageMarkdown`, `ToolCallBadge`, `ToolCallResult` (maps tool name → widget via registry, skeleton while loading)

## Key flows

- Web: `/api/chat` uses `getChatContext` + `buildSystemPrompt` + `buildTools()` (no orgId) with `streamText`; bots: `/api/webhooks/{telegram,whatsapp}` call `runAgent()` with explicit orgId/userId
- Chat file uploads go through `processChatAttachment`; a high-confidence/suggested match makes the model call `show_match_suggestion`, rendered as `MatchSuggestionWidget`
- Duplicate uploads (same hash) re-run matching in `after()` and report "(already existed, re-matching)"
- Requires `ANTHROPIC_API_KEY_CHAT` (run-agent throws at import time if unset)

## Data & integration

- Models: ChatLog, InboxItem, MatchSuggestion, Entry, Organization, Account, UserOrganization (plus reads via other features' queries)
- i18n namespaces: `agent`, `dashboard` (AgentSurface)
- Used by / uses: `/api/chat`, `/api/webhooks/telegram`, `/api/webhooks/whatsapp`, `app/(dashboard)/dashboard/page.tsx`; uses `@polso/agent/ocr`, `@polso/storage`, `@polso/matching`, `@polso/cache/ai-rate-limit` and queries from features alerts/analytics/banking/inbox/transactions/categories/counterparties/intelligence

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
