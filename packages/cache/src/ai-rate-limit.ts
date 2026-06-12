import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "./redis-client"

const LIMITS = {
  sonnet: { limit: 100, window: "24 h" as const },
  haiku:  { limit: 500, window: "24 h" as const },
}

let _limiters: Record<string, Ratelimit> | null = null

function getLimiters() {
  if (!_limiters) {
    const redis = getRedis()
    _limiters = {
      sonnet: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.sonnet.limit, LIMITS.sonnet.window), prefix: "rl:ai:sonnet" }),
      haiku:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.haiku.limit,  LIMITS.haiku.window),  prefix: "rl:ai:haiku"  }),
    }
  }
  return _limiters
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
  limit: number
}

export async function checkAiRateLimit(
  organizationId: string,
  model: "sonnet" | "haiku"
): Promise<RateLimitResult> {
  try {
    const { success, remaining, reset, limit } = await getLimiters()[model].limit(organizationId)
    return { allowed: success, remaining, reset, limit }
  } catch (err) {
    // Redis outage must degrade to unthrottled, not take down every
    // AI-backed endpoint (chat, webhooks, partner cron)
    console.error("[ai-rate-limit] Redis unavailable, failing open:", err)
    return { allowed: true, remaining: -1, reset: 0, limit: LIMITS[model].limit }
  }
}
