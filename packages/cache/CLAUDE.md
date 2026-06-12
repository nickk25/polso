# packages/cache — @polso/cache

Upstash Redis client, generic cache helpers, and per-organization AI rate limiting (sliding window via `@upstash/ratelimit`).

## What it exports

```typescript
// Redis client (also via subpath "@polso/cache/redis")
getRedis()  // lazy Redis singleton — throws a clear error if UPSTASH_* env vars are missing

// Cache helpers
cacheGet<T>(key)                  // → T | null
cacheSet<T>(key, value, ttlSeconds)  // SET with EX
cacheDel(key)                     // delete key
getOrSet<T>(key, ttlSeconds, fn)  // read-through: return cached value, else run fn and cache result

// AI rate limiting (also via subpath "@polso/cache/ai-rate-limit")
checkAiRateLimit(organizationId, model: "sonnet" | "haiku")  // → RateLimitResult

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
  limit: number
}
```

## Key concepts

**Lazy singleton:** `getRedis()` creates the Upstash REST client on first call and reuses it. Safe for serverless — no persistent connections, just HTTPS.

**Cache helpers throw on Redis failure.** `cacheGet`/`cacheSet`/`cacheDel`/`getOrSet` do not swallow errors — best-effort behavior is the caller's responsibility (`@polso/banking` wraps every call in try/catch so the bank picker and token fetch keep working without Redis).

**`getOrSet` caveat:** a cached `null` is indistinguishable from a miss (`cached !== null` check), so `fn` results of `null` are never cached.

**AI rate limits (per organization, sliding window, 24h):**
- `sonnet`: 100 requests / 24 h — Redis key prefix `rl:ai:sonnet`
- `haiku`: 500 requests / 24 h — Redis key prefix `rl:ai:haiku`

**`checkAiRateLimit` fails open.** If Redis is unavailable, it logs the error and returns `{ allowed: true, remaining: -1, reset: 0, limit }` instead of throwing — a Redis outage degrades to unthrottled rather than taking down every AI-backed endpoint (chat, webhooks, partner cron). `remaining: -1` signals the fail-open path.

**Consumer key conventions:** GoCardless keys live under `gc:*` (`gocardless:access-token:v2`, `gc:institutions:{country}`, `gc:institution:{id}`, `gc:cooldown:{accountId}`, `gc:manual-cooldown:{accountId}`); sync locks use raw `getRedis().set(key, "1", { nx: true, ex })`.

## Environment variables

```env
UPSTASH_REDIS_REST_URL    # Upstash Redis REST endpoint
UPSTASH_REDIS_REST_TOKEN  # Upstash Redis REST token
```

## Integration points

- `apps/web/app/api/chat/route.ts` — `checkAiRateLimit` before chat completions
- `apps/web/app/api/webhooks/whatsapp/route.ts`, `apps/web/app/api/webhooks/telegram/route.ts` — `checkAiRateLimit` before running the agent
- `apps/web/features/agent/lib/process-chat-attachment.ts` — `checkAiRateLimit` before OCR extraction
- `apps/web/features/banking/lib/sync-core.ts` — `getRedis` for sync locks (`nx` + TTL) and cooldowns, `cacheDel` to release locks
- `apps/web/features/banking/actions/sync-transactions.ts` — `getRedis` for manual-sync cooldown
- `apps/partner/app/api/cron/daily/route.ts` — `checkAiRateLimit` in the partner daily cron
- `@polso/banking` — `cacheGet`/`cacheSet` for GoCardless access token (23.5h TTL) and institution lists
- `@polso/inbox` — `checkAiRateLimit` before AI-backed inbox processing

## Dependencies

`@upstash/redis`, `@upstash/ratelimit`, `@types/node` (for `process.env`).
