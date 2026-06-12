/**
 * GoCardless Bank Account Data API client
 *
 * Plain fetch wrapper — no SDK required.
 * API base: https://bankaccountdata.gocardless.com
 *
 * Auth: service-level tokens (not per-user), cached in Redis across cold
 * starts (~23.5h TTL) with an in-memory fast path per invocation. Access
 * tokens expire in 24 hours.
 */

import type {
  BankingConfig,
  BankTransaction,
  BankProvider,
  GCTokenResponse,
  GCRequisition,
  GCAgreement,
  GCInstitution,
  GCAccountBalance,
  GCAccountDetails,
  GCRawTransaction,
  RequisitionStatus,
} from "./types"
import { transformTransaction } from "./transform"
import { getMaxHistoricalDays } from "./utils"
import { cacheGet, cacheSet } from "@polso/cache"

const GC_BASE = "https://bankaccountdata.gocardless.com"
const GC_TOKEN_CACHE_KEY = "gocardless:access-token:v2"
const INSTITUTION_CACHE_TTL = 86_400 // institutions are near-static; 24h

// In-memory fast path — also populated from Redis hits so a single
// invocation only pays one Redis round-trip regardless of call count
let _memToken: { value: string; expiresAt: number } | null = null

// ============================================
// Typed API errors
// ============================================

export class GCApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "GCApiError"
  }
}

export class GCRateLimitError extends GCApiError {
  constructor(
    status: number,
    message: string,
    public readonly retryAfterSeconds: number | null
  ) {
    super(status, message)
    this.name = "GCRateLimitError"
  }
}

function parseRetryAfterSeconds(res: Response, body: string): number | null {
  const header =
    res.headers.get("x-ratelimit-account-success-reset") ??
    res.headers.get("x-ratelimit-reset") ??
    res.headers.get("retry-after")
  if (header) {
    const n = parseInt(header, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  const match = body.match(/try again in\s+(\d+)\s+seconds?/i)
  return match ? parseInt(match[1], 10) : null
}

// ============================================
// Internal request helper
// ============================================

async function gcRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  let res = await fetch(`${GC_BASE}${path}`, { ...init, headers })

  // Transient 5xx on idempotent GETs: retry once with a short jittered backoff
  const method = (init.method ?? "GET").toUpperCase()
  if (res.status >= 500 && method === "GET") {
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))
    res = await fetch(`${GC_BASE}${path}`, { ...init, headers })
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    if (res.status === 429) {
      throw new GCRateLimitError(
        429,
        `GoCardless rate limit for ${path}: ${text}`,
        parseRetryAfterSeconds(res, text)
      )
    }
    throw new GCApiError(res.status, `GoCardless API error ${res.status} for ${path}: ${text}`)
  }

  // DELETE and some success responses have no body — don't attempt to parse
  if (res.status === 204) return undefined as T
  const body = await res.text()
  if (!body) return undefined as T
  return JSON.parse(body) as T
}

// ============================================
// Client factory
// ============================================

export function createGoCardlessClient(config: BankingConfig) {
  const { secretId, secretKey, redirectUri } = config

  // ============================================
  // Service-level token management
  // ============================================

  async function getAccessToken(): Promise<string> {
    // In-memory fast path (same invocation)
    const buffer = 60_000
    if (_memToken && Date.now() < _memToken.expiresAt - buffer) {
      return _memToken.value
    }

    const fetchFresh = async (): Promise<string> => {
      const data = await gcRequest<GCTokenResponse>("/api/v2/token/new/", {
        method: "POST",
        body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
      })
      _memToken = { value: data.access, expiresAt: Date.now() + data.access_expires * 1000 }
      try {
        // GC access tokens last 24h — cache for 23.5h (84600s) to stay safe
        await cacheSet(GC_TOKEN_CACHE_KEY, _memToken, 84600)
      } catch {
        // Redis unavailable — in-memory token still covers this invocation
      }
      return data.access
    }

    // Redis cache — persists across cold starts
    try {
      const cached = await cacheGet<{ value: string; expiresAt: number }>(GC_TOKEN_CACHE_KEY)
      if (cached && Date.now() < cached.expiresAt - buffer) {
        _memToken = cached
        return cached.value
      }
    } catch {
      // Redis unavailable — fall through to a fresh token
    }

    return fetchFresh()
  }

  // ============================================
  // Institutions
  // ============================================

  async function getInstitutions(countryCode: string): Promise<BankProvider[]> {
    const cacheKey = `gc:institutions:${countryCode}`
    try {
      const cached = await cacheGet<BankProvider[]>(cacheKey)
      if (cached && cached.length > 0) return cached
    } catch {
      // Redis unavailable — the bank picker must still work
    }

    const token = await getAccessToken()
    const data = await gcRequest<GCInstitution[]>(
      `/api/v2/institutions/?country=${countryCode}`,
      { token }
    )

    const providers = data.map((inst) => ({
      id: inst.id,
      name: inst.name,
      displayName: inst.name,
      logoUrl: inst.logo || null,
      countries: inst.countries,
      maxHistoricalDays: inst.transaction_total_days
        ? parseInt(inst.transaction_total_days, 10)
        : null,
    }))

    if (providers.length > 0) {
      try {
        await cacheSet(cacheKey, providers, INSTITUTION_CACHE_TTL)
      } catch {
        // best-effort cache
      }
    }

    return providers
  }

  async function getInstitution(institutionId: string): Promise<GCInstitution | null> {
    const cacheKey = `gc:institution:${institutionId}`
    try {
      const cached = await cacheGet<GCInstitution>(cacheKey)
      if (cached) return cached
    } catch {
      // Redis unavailable — fetch live
    }

    try {
      const token = await getAccessToken()
      const institution = await gcRequest<GCInstitution>(
        `/api/v2/institutions/${institutionId}/`,
        { token }
      )
      if (institution) {
        try {
          await cacheSet(cacheKey, institution, INSTITUTION_CACHE_TTL)
        } catch {
          // best-effort cache
        }
      }
      return institution
    } catch {
      return null
    }
  }

  // ============================================
  // End-user agreement
  // ============================================

  async function createEndUserAgreement(
    institutionId: string,
    transactionTotalDays: number
  ): Promise<GCAgreement> {
    const token = await getAccessToken()

    const institution = await getInstitution(institutionId)
    const maxHistoricalDays = getMaxHistoricalDays({
      institutionId,
      transactionTotalDays,
      separateContinuousHistoryConsent: institution?.separate_continuous_history_consent,
    })

    const createAgreement = (accessDays: number) =>
      gcRequest<GCAgreement>("/api/v2/agreements/enduser/", {
        method: "POST",
        token,
        body: JSON.stringify({
          institution_id: institutionId,
          access_scope: ["balances", "details", "transactions"],
          access_valid_for_days: accessDays,
          max_historical_days: maxHistoricalDays,
        }),
      })

    try {
      return await createAgreement(180)
    } catch (err) {
      if (err instanceof GCApiError && err.status >= 400 && err.status < 500) {
        return await createAgreement(90)
      }
      throw err
    }
  }

  // ============================================
  // Requisitions (bank connection flow)
  // ============================================

  async function buildLink({
    institutionId,
    agreement,
    redirect,
    reference,
  }: {
    institutionId: string
    agreement: string
    redirect: string
    reference: string
  }): Promise<{ requisitionId: string; link: string }> {
    const token = await getAccessToken()

    const data = await gcRequest<GCRequisition>("/api/v2/requisitions/", {
      method: "POST",
      token,
      body: JSON.stringify({
        redirect,
        institution_id: institutionId,
        agreement,
        reference,
      }),
    })

    return { requisitionId: data.id, link: data.link }
  }

  // Returns null only when the requisition no longer exists (404).
  // Other failures (429, 5xx) propagate so callers can react instead of
  // mistaking a transient error for a deleted connection.
  async function getRequisition(id: string): Promise<GCRequisition | null> {
    const token = await getAccessToken()
    try {
      return await gcRequest<GCRequisition>(`/api/v2/requisitions/${id}/`, { token })
    } catch (err) {
      if (err instanceof GCApiError && err.status === 404) return null
      throw err
    }
  }

  async function deleteRequisition(id: string): Promise<void> {
    const token = await getAccessToken()
    try {
      await gcRequest(`/api/v2/requisitions/${id}/`, { method: "DELETE", token })
    } catch (err) {
      // 404 = already deleted; treat as success. Anything else must propagate
      // so callers can queue the deletion for retry (RequisitionCleanupQueue).
      if (err instanceof GCApiError && err.status === 404) return
      throw err
    }
  }

  // ============================================
  // Requisition status check
  // ============================================

  function isRequisitionExpired(status: RequisitionStatus): boolean {
    return status === "EX" || status === "RJ"
  }

  // ============================================
  // Account details and balances
  // ============================================

  async function getAccountDetails(
    accountId: string,
    token?: string
  ): Promise<GCAccountDetails | null> {
    try {
      const t = token ?? (await getAccessToken())
      const [account, details] = await Promise.all([
        gcRequest<Omit<GCAccountDetails, "account">>(`/api/v2/accounts/${accountId}/`, {
          token: t,
        }),
        gcRequest<{ account: GCAccountDetails["account"] }>(
          `/api/v2/accounts/${accountId}/details/`,
          { token: t }
        ),
      ])
      return { ...account, ...details } as GCAccountDetails
    } catch {
      return null
    }
  }

  // Errors propagate (including GCRateLimitError) — callers must never
  // mistake a failed fetch for "this account has no balance".
  async function getAccountBalances(
    accountId: string,
    token?: string
  ): Promise<GCAccountBalance[]> {
    const t = token ?? (await getAccessToken())
    const data = await gcRequest<{ balances: GCAccountBalance[] }>(
      `/api/v2/accounts/${accountId}/balances/`,
      { token: t }
    )
    return data.balances ?? []
  }

  // ============================================
  // Transactions
  // ============================================

  /**
   * Fetch transactions for a single account.
   *
   * @param accountId  GoCardless account UUID
   * @param latest     If true, only fetch last 7 days (use for daily sync to respect rate limits)
   */
  async function getTransactions(
    accountId: string,
    latest = false
  ): Promise<BankTransaction[]> {
    const token = await getAccessToken()

    let path = `/api/v2/accounts/${accountId}/transactions/`
    if (latest) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const dateFrom = sevenDaysAgo.toISOString().split("T")[0]
      path += `?date_from=${dateFrom}`
    }

    const data = await gcRequest<{
      transactions: { booked: GCRawTransaction[]; pending?: GCRawTransaction[] }
    }>(path, { token })

    // Skip pending transactions — their IDs are temporary and change when settled,
    // causing duplicates on the next sync once the transaction books.
    return (data.transactions?.booked ?? []).map((tx) =>
      transformTransaction({ transaction: tx, accountId, pending: false })
    )
  }

  return {
    getAccessToken,
    getInstitutions,
    getInstitution,
    createEndUserAgreement,
    buildLink,
    getRequisition,
    deleteRequisition,
    isRequisitionExpired,
    getAccountDetails,
    getAccountBalances,
    getTransactions,
  }
}
