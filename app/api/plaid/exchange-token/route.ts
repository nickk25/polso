import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import {
  exchangePublicToken,
  getAccounts,
  getBalances,
  getInstitution,
  updateItemWebhook,
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

    // Register webhook URL on the Item (belt-and-suspenders alongside the Link token webhook param)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      await updateItemWebhook(accessToken, `${appUrl}/api/webhooks/plaid`).catch(
        (err) => console.warn("[exchange-token] Failed to set webhook URL:", err)
      )
    }

    // Get institution details for logo (non-blocking, don't fail if it errors)
    let institutionLogo: string | null = null
    try {
      const institution = await getInstitution(institutionId, [CountryCode.Es])
      institutionLogo = institution.logo || null
    } catch (error) {
      console.warn("Failed to get institution details:", error)
    }

    // Get accounts and balances from Plaid
    const [accountsResponse, balancesResponse] = await Promise.all([
      getAccounts(accessToken),
      getBalances(accessToken),
    ])

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
            currency: balance?.balances.iso_currency_code || "EUR",
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

    // Return immediately with the created accounts
    // Transaction sync will happen on first manual sync or cron job
    return NextResponse.json({
      success: true,
      accountsCreated: createdAccounts.length,
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
