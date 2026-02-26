import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type LinkTokenCreateRequest,
  type ItemPublicTokenExchangeRequest,
  type TransactionsSyncRequest,
  type AccountsBalanceGetRequest,
  type AccountsGetRequest,
  type ItemGetRequest,
  type InstitutionsGetByIdRequest,
  type Transaction as PlaidTransaction,
  type AccountBase,
  type RemovedTransaction,
} from "plaid"

// Plaid client configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

// ============================================
// Link Token
// ============================================

export interface CreateLinkTokenParams {
  userId: string
  products?: Products[]
  countryCodes?: CountryCode[]
}

export async function createLinkToken({
  userId,
  products = [Products.Transactions],
  countryCodes = [CountryCode.Es],
}: CreateLinkTokenParams) {
  // Webhook URL receives TRANSACTIONS and ITEM events for this Item.
  // Must be set here (not in the Plaid Dashboard) for transaction webhooks.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const webhookUrl = appUrl ? `${appUrl}/api/webhooks/plaid` : undefined

  const request: LinkTokenCreateRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: "Polso",
    products,
    country_codes: countryCodes,
    language: "es",
    webhook: webhookUrl,
  }

  const response = await plaidClient.linkTokenCreate(request)
  return response.data
}

// ============================================
// Token Exchange
// ============================================

export async function exchangePublicToken(publicToken: string) {
  const request: ItemPublicTokenExchangeRequest = {
    public_token: publicToken,
  }

  const response = await plaidClient.itemPublicTokenExchange(request)
  return response.data
}

// ============================================
// Accounts
// ============================================

export async function getAccounts(accessToken: string) {
  const request: AccountsGetRequest = {
    access_token: accessToken,
  }

  const response = await plaidClient.accountsGet(request)
  return response.data
}

export async function getBalances(accessToken: string, accountIds?: string[]) {
  const request: AccountsBalanceGetRequest = {
    access_token: accessToken,
    options: accountIds ? { account_ids: accountIds } : undefined,
  }

  const response = await plaidClient.accountsBalanceGet(request)
  return response.data
}

// ============================================
// Item (Bank Connection)
// ============================================

export async function getItem(accessToken: string) {
  const request: ItemGetRequest = {
    access_token: accessToken,
  }

  const response = await plaidClient.itemGet(request)
  return response.data
}

export async function removeItem(accessToken: string) {
  const response = await plaidClient.itemRemove({
    access_token: accessToken,
  })
  return response.data
}

// ============================================
// Institution
// ============================================

export async function getInstitution(institutionId: string, countryCodes: CountryCode[] = [CountryCode.Es]) {
  const request: InstitutionsGetByIdRequest = {
    institution_id: institutionId,
    country_codes: countryCodes,
    options: {
      include_optional_metadata: true,
    },
  }

  const response = await plaidClient.institutionsGetById(request)
  return response.data.institution
}

// ============================================
// Transactions Sync
// ============================================

export interface TransactionsSyncResult {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: RemovedTransaction[]
  nextCursor: string
  hasMore: boolean
  accounts: AccountBase[]
}

export async function syncTransactions(
  accessToken: string,
  cursor?: string | null,
  count: number = 500
): Promise<TransactionsSyncResult> {
  const allAdded: PlaidTransaction[] = []
  const allModified: PlaidTransaction[] = []
  const allRemoved: RemovedTransaction[] = []
  let accounts: AccountBase[] = []
  let currentCursor = cursor || ""
  let hasMore = true

  while (hasMore) {
    const request: TransactionsSyncRequest = {
      access_token: accessToken,
      cursor: currentCursor || undefined,
      count,
      options: {
        include_personal_finance_category: true,
      },
    }

    const response = await plaidClient.transactionsSync(request)
    const data = response.data

    allAdded.push(...data.added)
    allModified.push(...data.modified)
    allRemoved.push(...data.removed)
    accounts = data.accounts
    currentCursor = data.next_cursor
    hasMore = data.has_more
  }

  return {
    added: allAdded,
    modified: allModified,
    removed: allRemoved,
    nextCursor: currentCursor,
    hasMore: false,
    accounts,
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Normalize counterparty name for vendor matching
 */
export function normalizeCounterpartyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
}

/**
 * Determine transaction type from Plaid amount
 * Plaid: positive = money leaving account (expense), negative = money coming in (income)
 */
export function getTransactionType(amount: number): "debit" | "credit" {
  return amount > 0 ? "debit" : "credit"
}

/**
 * Detect income source from Plaid transaction category
 */
export function detectIncomeSource(tx: PlaidTransaction): string {
  const category = tx.personal_finance_category?.primary || ""
  const detailed = tx.personal_finance_category?.detailed || ""

  if (category === "INCOME" && (detailed.includes("WAGES") || detailed.includes("SALARY"))) {
    return "salary"
  }
  if (category === "INCOME" && (detailed.includes("DIVIDENDS") || detailed.includes("INTEREST"))) {
    return "investment"
  }
  if (detailed.includes("REFUND")) {
    return "refund"
  }
  if (category === "TRANSFER_IN") {
    return "transfer"
  }
  return "other"
}

// Re-export types for convenience
export type { PlaidTransaction, AccountBase, RemovedTransaction }
