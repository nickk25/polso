/**
 * Tink API client
 *
 * Plain fetch wrapper — no SDK required.
 * API base: https://api.tink.com
 * Tink Link: https://link.tink.com/1.0/transactions/connect-accounts
 */

import type {
  TinkConfig,
  BankAccount,
  BankTransaction,
  TransactionsFetchResult,
  TinkTokenResult,
  BankProvider,
} from "./types"

const TINK_API_BASE = "https://api.tink.com"
const TINK_LINK_BASE = "https://link.tink.com"

// ============================================
// Internal Tink API types
// ============================================

interface TinkAmountValue {
  unscaledValue: string
  scale: string
}

interface TinkAmount {
  value: TinkAmountValue
  currencyCode: string
}

interface TinkRawTransaction {
  id: string
  accountId: string
  amount: TinkAmount
  descriptions: {
    original: string
    display: string
  }
  dates: {
    booked: string
    value?: string
  }
  status: "BOOKED" | "PENDING" | "UNDEFINED"
  types: {
    type: string
    financialInstitutionTypeCode?: string
  }
}

interface TinkRawAccount {
  id: string
  name: string
  type: string
  financialInstitutionId?: string
  identifiers?: {
    iban?: { iban: string }
    financialInstitution?: { accountNumber: string }
  }
  balance?: {
    available?: { value: TinkAmountValue; currencyCode: string }
    booked?: { value: TinkAmountValue; currencyCode: string }
    reserved?: { value: TinkAmountValue; currencyCode: string }
    creditLimit?: { value: TinkAmountValue; currencyCode: string }
  }
  flags?: string[]
  dates?: {
    lastRefreshed?: string
  }
}

interface TinkTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope: string
  credentialsId?: string
}

interface TinkProviderResponse {
  name: string
  displayName?: string
  marketCode?: string
  images?: {
    icon?: string
    banner?: string
  }
}

// ============================================
// Helpers
// ============================================

function parseAmount(value: TinkAmountValue): number {
  const unscaled = parseFloat(value.unscaledValue)
  const scale = parseInt(value.scale, 10)
  return unscaled / Math.pow(10, scale)
}

/**
 * Convert Tink amount to Polso convention.
 * Tink: negative = expense (money out), positive = income (money in)
 * Polso: positive = expense, negative = income
 */
function normalizeTinkAmount(tinkAmount: number): number {
  return -tinkAmount
}

function maskFromIban(iban: string | undefined): string | null {
  if (!iban || iban.length < 4) return null
  return iban.slice(-4)
}

function mapTinkAccountType(type: string): { type: string; subtype: string | null } {
  const upper = type.toUpperCase()
  const map: Record<string, { type: string; subtype: string | null }> = {
    CHECKING: { type: "depository", subtype: "checking" },
    SAVINGS: { type: "depository", subtype: "savings" },
    CREDIT_CARD: { type: "credit", subtype: "credit card" },
    LOAN: { type: "loan", subtype: null },
    INVESTMENT: { type: "investment", subtype: null },
    PENSION: { type: "investment", subtype: "pension" },
    EXTERNAL: { type: "depository", subtype: null },
  }
  return map[upper] ?? { type: "depository", subtype: null }
}

async function tinkRequest<T>(
  path: string,
  options: RequestInit & { bearerToken?: string; clientId?: string; clientSecret?: string }
): Promise<T> {
  const { bearerToken, clientId, clientSecret, ...init } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }

  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`
  }

  // For form-encoded token requests we override Content-Type
  if ((init.body as string)?.startsWith("grant_type=")) {
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const res = await fetch(`${TINK_API_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Tink API error ${res.status} for ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ============================================
// Client factory
// ============================================

export function createTinkClient(config: TinkConfig) {
  const { clientId, clientSecret, redirectUri } = config

  // ============================================
  // OAuth — Client Credentials
  // ============================================

  async function getClientAccessToken(scope = "user:create"): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    })

    const data = await tinkRequest<TinkTokenResponse>("/api/v1/oauth/token", {
      method: "POST",
      body: body.toString(),
    })

    return data.access_token
  }

  // ============================================
  // OAuth — Authorization Code Exchange
  // ============================================

  async function exchangeCode(code: string): Promise<TinkTokenResult> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    })

    const data = await tinkRequest<TinkTokenResponse>("/api/v1/oauth/token", {
      method: "POST",
      body: body.toString(),
    })

    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? "",
      expiresAt,
      credentialId: data.credentialsId ?? "",
    }
  }

  // ============================================
  // OAuth — Token Refresh
  // ============================================

  async function refreshAccessToken(refreshToken: string): Promise<TinkTokenResult> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    })

    const data = await tinkRequest<TinkTokenResponse>("/api/v1/oauth/token", {
      method: "POST",
      body: body.toString(),
    })

    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt,
      credentialId: data.credentialsId ?? "",
    }
  }

  // ============================================
  // Accounts
  // ============================================

  async function getAccounts(accessToken: string): Promise<BankAccount[]> {
    const data = await tinkRequest<{ accounts: TinkRawAccount[] }>(
      "/data/v2/accounts",
      { bearerToken: accessToken }
    )

    return (data.accounts ?? []).map((a) => {
      const { type, subtype } = mapTinkAccountType(a.type)
      const iban = a.identifiers?.iban?.iban
      const accountNumber = a.identifiers?.financialInstitution?.accountNumber
      const mask = maskFromIban(iban) ?? (accountNumber ? accountNumber.slice(-4) : null)

      const available = a.balance?.available
        ? parseAmount(a.balance.available.value)
        : null
      const booked = a.balance?.booked
        ? parseAmount(a.balance.booked.value)
        : null
      const creditLimit = a.balance?.creditLimit
        ? parseAmount(a.balance.creditLimit.value)
        : null

      const currency = a.balance?.booked?.currencyCode ?? "EUR"

      return {
        externalAccountId: a.id,
        name: a.name,
        mask,
        type,
        subtype,
        currency,
        balanceAvailable: available,
        balanceCurrent: booked,
        balanceLimit: creditLimit,
      }
    })
  }

  // ============================================
  // Balances
  // ============================================

  async function getBalances(accessToken: string): Promise<BankAccount[]> {
    // Tink balances are included in accounts endpoint; re-use getAccounts
    return getAccounts(accessToken)
  }

  // ============================================
  // Transactions
  // ============================================

  async function getTransactions(
    accessToken: string,
    pageToken?: string | null
  ): Promise<TransactionsFetchResult> {
    const url = new URL(`${TINK_API_BASE}/data/v2/transactions`)
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken)
    }

    const data = await tinkRequest<{
      transactions: TinkRawTransaction[]
      nextPageToken?: string
    }>(url.pathname + url.search, { bearerToken: accessToken })

    const transactions: BankTransaction[] = (data.transactions ?? []).map((tx) => {
      const rawAmount = parseAmount(tx.amount.value)
      const amount = normalizeTinkAmount(rawAmount)
      const transactionType = amount > 0 ? ("debit" as const) : ("credit" as const)

      const bookedDate = new Date(tx.dates.booked)
      const valueDate = tx.dates.value ? new Date(tx.dates.value) : null
      const pending = tx.status === "PENDING"

      return {
        externalTransactionId: tx.id,
        externalAccountId: tx.accountId,
        amount,
        currency: tx.amount.currencyCode,
        date: bookedDate,
        authorizedDate: valueDate,
        name: tx.descriptions.original ?? null,
        merchantName: tx.descriptions.display ?? null,
        pending,
        paymentChannel: null, // Tink doesn't expose payment channel
        transactionType,
        category: tx.types.type ?? null,
        categoryDetailed: tx.types.financialInstitutionTypeCode ?? null,
      }
    })

    return {
      transactions,
      nextPageToken: data.nextPageToken ?? null,
    }
  }

  // ============================================
  // Provider (Institution)
  // ============================================

  async function getProvider(providerId: string): Promise<BankProvider | null> {
    try {
      const clientToken = await getClientAccessToken("provider:read")
      const data = await tinkRequest<TinkProviderResponse>(
        `/api/v1/providers/${encodeURIComponent(providerId)}`,
        { bearerToken: clientToken }
      )

      return {
        id: providerId,
        name: data.name,
        displayName: data.displayName ?? null,
        logoUrl: data.images?.icon ?? null,
      }
    } catch {
      return null
    }
  }

  // ============================================
  // Credentials (bank connection)
  // ============================================

  async function deleteCredential(
    accessToken: string,
    credentialId: string
  ): Promise<void> {
    const res = await fetch(
      `${TINK_API_BASE}/api/v1/credentials/${encodeURIComponent(credentialId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // 404 means already deleted — treat as success
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => "")
      throw new Error(`Failed to delete Tink credential: ${res.status} ${text}`)
    }
  }

  // ============================================
  // Tink Link URL Builder
  // ============================================

  /**
   * Build the Tink Link v2 URL for connecting a bank account.
   *
   * Redirect flow:
   *   Success → redirectUri?code=X&state=Y
   *   Failure → redirectUri?error=X&error_reason=Y&state=Z
   *
   * @param state  Opaque string passed through unchanged (carry orgId + userId)
   */
  function buildTinkLinkUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      market: "ES",
      locale: "es_ES",
      state,
    })

    return `${TINK_LINK_BASE}/1.0/transactions/connect-accounts?${params.toString()}`
  }

  return {
    getClientAccessToken,
    exchangeCode,
    refreshAccessToken,
    getAccounts,
    getBalances,
    getTransactions,
    getProvider,
    deleteCredential,
    buildTinkLinkUrl,
  }
}
