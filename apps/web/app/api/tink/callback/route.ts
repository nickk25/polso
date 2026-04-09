import { NextRequest, NextResponse } from "next/server"
import { createTinkClient } from "@polso/banking"
import { prisma } from "@/lib/db"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

function getTinkClient() {
  return createTinkClient({
    clientId: process.env.TINK_CLIENT_ID!,
    clientSecret: process.env.TINK_CLIENT_SECRET!,
    redirectUri: process.env.TINK_REDIRECT_URI!,
  })
}

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, APP_URL))
}

/**
 * Tink Link redirect callback.
 *
 * Success: ?code=X&state=Y
 * Failure: ?error=X&error_reason=Y&state=Z
 *
 * After exchange, creates Account records and redirects to /settings/banking.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorReason = searchParams.get("error_reason")

  // Handle Tink Link error (user cancelled, bank error, etc.)
  if (error || !code) {
    const reason = errorReason ?? error ?? "unknown"
    console.warn(`[Tink callback] Error from Tink Link: ${reason}`)
    return redirect(`/settings/banking?error=${encodeURIComponent(reason)}`)
  }

  // Decode and validate state
  if (!state) {
    return redirect("/settings/banking?error=invalid_state")
  }

  let organizationId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8")) as {
      userId: string
      organizationId: string
    }
    organizationId = decoded.organizationId

    // Verify the organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })
    if (!org) {
      return redirect("/settings/banking?error=organization_not_found")
    }
  } catch {
    return redirect("/settings/banking?error=invalid_state")
  }

  try {
    const tink = getTinkClient()

    // Exchange authorization code for access + refresh tokens
    const tokenResult = await tink.exchangeCode(code)

    // Fetch accounts and provider info
    const [tinkAccounts, provider] = await Promise.all([
      tink.getAccounts(tokenResult.accessToken),
      tink.getProvider(tokenResult.credentialId).catch(() => null),
    ])

    // Create Account records in DB
    await Promise.all(
      tinkAccounts.map((tinkAccount) =>
        prisma.account.create({
          data: {
            organizationId,
            tinkCredentialId: tokenResult.credentialId,
            tinkAccessToken: tokenResult.accessToken,
            tinkRefreshToken: tokenResult.refreshToken,
            tinkTokenExpiresAt: tokenResult.expiresAt,
            externalAccountId: tinkAccount.externalAccountId,
            tinkProviderId: provider?.id ?? null,
            name: tinkAccount.name,
            mask: tinkAccount.mask,
            accountType: tinkAccount.type,
            accountSubtype: tinkAccount.subtype,
            currency: tinkAccount.currency,
            institutionName: provider?.displayName ?? provider?.name ?? null,
            institutionLogo: provider?.logoUrl ?? null,
            status: "active",
            balanceAvailable: tinkAccount.balanceAvailable,
            balanceCurrent: tinkAccount.balanceCurrent,
            balanceLimit: tinkAccount.balanceLimit,
            lastSyncedAt: new Date(),
          },
        })
      )
    )

    return redirect("/settings/banking?connected=true")
  } catch (err) {
    console.error("[Tink callback] Error processing callback:", err)
    return redirect("/settings/banking?error=connection_failed")
  }
}
