import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import {
  exchangePublicToken,
  getAccounts,
  getBalances,
  getInstitution,
  syncTransactions,
  normalizeCounterpartyName,
  getTransactionType,
} from "@/features/banking/lib/plaid-client"
import { CountryCode } from "plaid"

interface ExchangeTokenRequest {
  publicToken: string
  institutionId: string
  institutionName: string
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get organization for user
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    const { publicToken, institutionId, institutionName }: ExchangeTokenRequest =
      await request.json()

    // Exchange public token for access token
    const exchangeResponse = await exchangePublicToken(publicToken)
    const { access_token: accessToken, item_id: itemId } = exchangeResponse

    // Get institution details for logo
    let institutionLogo: string | null = null
    try {
      const institution = await getInstitution(institutionId, [CountryCode.Us])
      institutionLogo = institution.logo || null
    } catch (error) {
      console.warn("Failed to get institution details:", error)
    }

    // Get accounts from Plaid
    const accountsResponse = await getAccounts(accessToken)

    // Get balances
    const balancesResponse = await getBalances(accessToken)

    // Create accounts in database
    const createdAccounts = await Promise.all(
      accountsResponse.accounts.map(async (plaidAccount) => {
        const balance = balancesResponse.accounts.find(
          (b) => b.account_id === plaidAccount.account_id
        )

        return prisma.account.create({
          data: {
            organizationId: userOrg.organizationId,
            plaidItemId: itemId,
            plaidAccessToken: accessToken,
            plaidAccountId: plaidAccount.account_id,
            plaidInstitutionId: institutionId,
            name: plaidAccount.name,
            mask: plaidAccount.mask || null,
            officialName: plaidAccount.official_name || null,
            accountType: plaidAccount.type,
            accountSubtype: plaidAccount.subtype || null,
            currency: balance?.balances.iso_currency_code || "USD",
            institutionName: institutionName,
            institutionLogo: institutionLogo,
            status: "active",
            balanceAvailable: balance?.balances.available || null,
            balanceCurrent: balance?.balances.current || null,
            balanceLimit: balance?.balances.limit || null,
            lastSyncedAt: new Date(),
          },
        })
      })
    )

    // Initial transaction sync
    const syncResult = await syncTransactions(accessToken)

    // Import transactions for each account
    let transactionsImported = 0
    let expensesCreated = 0

    for (const tx of syncResult.added) {
      const account = createdAccounts.find(
        (a: { plaidAccountId: string | null }) => a.plaidAccountId === tx.account_id
      )
      if (!account) continue

      // Determine counterparty name
      const counterpartyName = tx.merchant_name || tx.name || null
      const normalizedCounterparty = counterpartyName
        ? normalizeCounterpartyName(counterpartyName)
        : null

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          organizationId: userOrg.organizationId,
          accountId: account.id,
          plaidTransactionId: tx.transaction_id,
          amount: tx.amount,
          currency: tx.iso_currency_code || "USD",
          date: new Date(tx.date),
          authorizedDate: tx.authorized_date
            ? new Date(tx.authorized_date)
            : null,
          name: tx.name,
          merchantName: tx.merchant_name || null,
          pending: tx.pending,
          paymentChannel: tx.payment_channel,
          transactionType: getTransactionType(tx.amount),
          category: tx.personal_finance_category?.primary || null,
          categoryDetailed: tx.personal_finance_category?.detailed || null,
          counterpartyName: normalizedCounterparty,
        },
      })

      transactionsImported++

      // Create expense for outgoing transactions (positive amounts in Plaid = money out)
      if (tx.amount > 0 && !tx.pending) {
        await prisma.expense.create({
          data: {
            organizationId: userOrg.organizationId,
            transactionId: transaction.id,
            amount: tx.amount,
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            expenseType: "variable",
            status: "pending",
            isManual: false,
          },
        })

        expensesCreated++
      }
    }

    // Update cursor for incremental sync
    await prisma.account.updateMany({
      where: {
        plaidItemId: itemId,
      },
      data: {
        plaidCursor: syncResult.nextCursor,
      },
    })

    return NextResponse.json({
      success: true,
      accountsCreated: createdAccounts.length,
      transactionsImported,
      expensesCreated,
      accounts: createdAccounts.map((a: { id: string; name: string; mask: string | null; accountType: string | null; accountSubtype: string | null }) => ({
        id: a.id,
        name: a.name,
        mask: a.mask,
        type: a.accountType,
        subtype: a.accountSubtype,
      })),
    })
  } catch (error) {
    console.error("Error exchanging token:", error)
    return NextResponse.json(
      { error: "Failed to connect bank account" },
      { status: 500 }
    )
  }
}
