import { NextRequest, NextResponse, after } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { selectPrimaryBalance, getAvailableBalance, mapCashAccountType } from "@polso/banking"
import { prisma, getPartnerNotificationEmail } from "@polso/db"
import { addDays } from "date-fns"
import { syncTransactionsCore } from "@/features/banking/lib/sync-core"
import { getGoCardlessClient } from "@/features/banking/lib/gocardless-client"
import { sendPartnerClientConnected } from "@polso/email/send"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, APP_URL))
}

/**
 * GoCardless OAuth callback.
 *
 * GoCardless redirects here after the user authenticates with their bank.
 * We use the authenticated session to find the pending requisition,
 * fetch the linked accounts, and create Account records.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // GoCardless may pass error details for failed connections
  const error = searchParams.get("error")
  if (error) {
    console.warn(`[GoCardless callback] Error from GoCardless: ${error}`)
    return redirect(`/settings/banking?error=${encodeURIComponent(error)}`)
  }

  try {
    const { user } = await neonAuth()
    if (!user) {
      return redirect("/auth/sign-in")
    }

    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true, organization: { select: { onboardingCompletedAt: true } } },
    })

    if (!userOrg) {
      return redirect("/settings/banking?error=organization_not_found")
    }

    const organizationId = userOrg.organizationId
    const isOnboarding = !userOrg.organization.onboardingCompletedAt

    // Find the most recent pending requisition for this org
    const pending = await prisma.pendingRequisition.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    })

    if (!pending) {
      return redirect("/settings/banking?error=no_pending_connection")
    }

    const gc = getGoCardlessClient()

    // Verify requisition is in linked (LN) or granted access (GA) state
    const requisition = await gc.getRequisition(pending.requisitionId)
    if (!requisition) {
      await prisma.pendingRequisition.delete({ where: { id: pending.id } })
      return redirect("/settings/banking?error=requisition_not_found")
    }

    if (requisition.status === "RJ" || requisition.status === "EX") {
      await prisma.pendingRequisition.delete({ where: { id: pending.id } })
      return redirect(`/settings/banking?error=connection_rejected`)
    }

    if (!requisition.accounts?.length) {
      // User authenticated but no accounts linked yet — redirect with success
      // and let the sync job pick them up when status becomes LN
      await prisma.pendingRequisition.delete({ where: { id: pending.id } })
      return redirect(isOnboarding ? "/onboarding?connected=true" : "/settings/banking?connected=true")
    }

    // Fetch institution info for display
    const institution = await gc.getInstitution(pending.institutionId)

    // Default expiry: 90 days from now (conservative)
    const requisitionExpiresAt = addDays(new Date(), 90)

    // Check if this is the first bank connection for this org
    const existingAccountCount = await prisma.account.count({ where: { organizationId } })
    const isFirstConnection = existingAccountCount === 0

    // Create or update an Account record for each account in the requisition.
    // Details/balances degrade per account — a transient failure (429, 5xx)
    // must not abort the whole connection or overwrite an existing balance.
    await Promise.all(
      requisition.accounts.map(async (accountId) => {
        const [details, balancesResult] = await Promise.all([
          gc.getAccountDetails(accountId),
          gc.getAccountBalances(accountId).then(
            (balances) => ({ fetched: true, balances }),
            (err: unknown) => {
              console.warn(`[GoCardless callback] balances fetch failed for ${accountId}:`, err)
              return { fetched: false, balances: [] }
            }
          ),
        ])
        const { balances } = balancesResult

        const account = details?.account
        const iban = details?.iban ?? account?.iban ?? null
        const mask = iban && iban.length >= 4 ? iban.slice(-4) : null

        const currency = account?.currency ?? "EUR"
        const rawName = account?.name ?? account?.product ?? account?.ownerName ?? details?.owner_name ?? institution?.name ?? "Bank Account"
        const name = rawName.toLowerCase().replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase())

        const primaryBalance = selectPrimaryBalance(balances, currency)
        const balanceCurrent = primaryBalance ? parseFloat(primaryBalance.balanceAmount.amount) : null
        const balanceAvailable = getAvailableBalance(balances, currency)
        const { accountType, accountSubtype } = mapCashAccountType(account?.cashAccountType)

        const existing = await prisma.account.findFirst({
          where: { organizationId, externalAccountId: accountId },
          select: { id: true },
        })

        const accountData = {
          requisitionId: pending.requisitionId,
          institutionId: pending.institutionId,
          requisitionExpiresAt,
          externalAccountId: accountId,
          iban,
          bic: institution?.bic ?? null,
          name,
          mask,
          accountType,
          accountSubtype,
          currency,
          institutionName: institution?.name ?? null,
          institutionLogo: institution?.logo ?? null,
          status: "active",
          // Only write balances when the fetch succeeded — never wipe an
          // existing balance because of a transient error during reconnect
          ...(balancesResult.fetched ? { balanceCurrent, balanceAvailable } : {}),
          lastSyncedAt: new Date(),
          syncError: null,
          syncErrorRetries: 0,
        }

        if (existing) {
          await prisma.account.update({ where: { id: existing.id }, data: accountData })
        } else {
          await prisma.account.create({ data: { organizationId, ...accountData } })
        }
      })
    )

    // Clean up pending requisition
    await prisma.pendingRequisition.delete({ where: { id: pending.id } })

    // Mark accounts as pending sync — SyncMonitor polls for lastSyncedAt: null
    await prisma.account.updateMany({
      where: { organizationId, externalAccountId: { in: requisition.accounts } },
      data: { lastSyncedAt: null },
    })

    // Notify partner if this is the client's first bank connection
    if (isFirstConnection) {
      void (async () => {
        try {
          const partnerLink = await prisma.partnerClient.findFirst({
            where: { clientId: organizationId, status: "active" },
            select: { partner: { select: { id: true, notifyOnClientConnected: true } } },
          })
          if (partnerLink?.partner.notifyOnClientConnected) {
            const recipient = await getPartnerNotificationEmail(partnerLink.partner.id)
            if (recipient) {
              const clientOrg = await prisma.organization.findUnique({
                where: { id: organizationId },
                select: { name: true },
              })
              const partnerAppUrl = process.env.NEXT_PUBLIC_PARTNER_APP_URL ?? ""
              await sendPartnerClientConnected(
                recipient.email,
                recipient.name,
                clientOrg?.name ?? organizationId,
                "first_bank",
                `${partnerAppUrl}/clients/${organizationId}`
              )
            }
          }
        } catch (err) {
          console.error("[GoCardless callback] partner notify failed:", err)
        }
      })()
    }

    // Full-history sync runs after the redirect so the user isn't blocked waiting.
    // initial=true disables the 7-day window and fetches all available history.
    after(() =>
      syncTransactionsCore(organizationId, { initial: true }).catch((err) =>
        console.error("[GoCardless callback] Initial sync error:", err)
      )
    )

    return redirect(isOnboarding ? "/onboarding?connected=true" : "/settings/banking?connected=true")
  } catch (err) {
    console.error("[GoCardless callback] Error processing callback:", err)
    return redirect("/settings/banking?error=connection_failed")
  }
}
