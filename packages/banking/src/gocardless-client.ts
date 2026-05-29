/**
 * GoCardless Bank Account Data API client
 *
 * Plain fetch wrapper — no SDK required.
 * API base: https://bankaccountdata.gocardless.com
 *
 * Auth: service-level tokens (not per-user). Tokens are cached in memory
 * for the lifetime of the process/serverless invocation. Access tokens
 * expire in 24 hours — safe to re-fetch on each cold start.
 */

import type {
  BankingConfig,
  BankAccount,
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
import { transformTransaction, transformAccount } from "./transform"
import { getMaxHistoricalDays } from "./utils"

const GC_BASE = "https://bankaccountdata.gocardless.com"

// ============================================
// In-memory token cache (valid within one process/invocation)
// ============================================

let _cachedAccessToken: { value: string; expiresAt: number } | null = null

// ============================================
// Typed API error
// ============================================

class GCApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "GCApiError"
  }
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

  const res = await fetch(`${GC_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new GCApiError(res.status, `GoCardless API error ${res.status} for ${path}: ${text}`)
  }

  return res.json() as Promise<T>
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
    const buffer = 60_000 // 1-min buffer before expiry

    if (_cachedAccessToken && Date.now() < _cachedAccessToken.expiresAt - buffer) {
      return _cachedAccessToken.value
    }

    const data = await gcRequest<GCTokenResponse>("/api/v2/token/new/", {
      method: "POST",
      body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
    })

    _cachedAccessToken = {
      value: data.access,
      expiresAt: Date.now() + data.access_expires * 1000,
    }

    return data.access
  }

  // ============================================
  // Institutions
  // ============================================

  async function getInstitutions(countryCode: string): Promise<BankProvider[]> {
    const token = await getAccessToken()
    const data = await gcRequest<GCInstitution[]>(
      `/api/v2/institutions/?country=${countryCode}`,
      { token }
    )

    return data.map((inst) => ({
      id: inst.id,
      name: inst.name,
      displayName: inst.name,
      logoUrl: inst.logo || null,
      countries: inst.countries,
      maxHistoricalDays: inst.transaction_total_days
        ? parseInt(inst.transaction_total_days, 10)
        : null,
    }))
  }

  async function getInstitution(institutionId: string): Promise<GCInstitution | null> {
    try {
      const token = await getAccessToken()
      return await gcRequest<GCInstitution>(`/api/v2/institutions/${institutionId}/`, { token })
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

  async function getRequisition(id: string): Promise<GCRequisition | null> {
    try {
      const token = await getAccessToken()
      return await gcRequest<GCRequisition>(`/api/v2/requisitions/${id}/`, { token })
    } catch {
      return null
    }
  }

  async function deleteRequisition(id: string): Promise<void> {
    try {
      const token = await getAccessToken()
      await gcRequest(`/api/v2/requisitions/${id}/`, { method: "DELETE", token })
    } catch {
      // 404 = already deleted; treat as success
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

  async function getAccountBalances(
    accountId: string,
    token?: string
  ): Promise<GCAccountBalance[]> {
    try {
      const t = token ?? (await getAccessToken())
      const data = await gcRequest<{ balances: GCAccountBalance[] }>(
        `/api/v2/accounts/${accountId}/balances/`,
        { token: t }
      )
      return data.balances ?? []
    } catch {
      return []
    }
  }

  /**
   * Fetch accounts for a requisition.
   * Returns normalized BankAccount[] with balances and expiry.
   */
  async function getAccounts(
    requisitionId: string
  ): Promise<BankAccount[]> {
    const token = await getAccessToken()
    const requisition = await gcRequest<GCRequisition>(
      `/api/v2/requisitions/${requisitionId}/`,
      { token }
    )

    if (!requisition?.accounts?.length) return []

    const institution = await getInstitution(requisition.institution_id)

    return Promise.all(
      requisition.accounts.map(async (accountId) => {
        const [details, balances] = await Promise.all([
          getAccountDetails(accountId, token),
          getAccountBalances(accountId, token),
        ])

        return transformAccount({
          id: accountId,
          details,
          balances,
          institution,
        })
      })
    )
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

    const booked = (data.transactions?.booked ?? []).map((tx) =>
      transformTransaction({ transaction: tx, accountId, pending: false })
    )
    const pending = (data.transactions?.pending ?? []).map((tx) =>
      transformTransaction({ transaction: tx, accountId, pending: true })
    )

    return [...booked, ...pending]
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
    getAccounts,
    getAccountDetails,
    getAccountBalances,
    getTransactions,
  }
}
