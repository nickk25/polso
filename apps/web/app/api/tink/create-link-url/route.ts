import { NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { createTinkClient } from "@polso/banking"
import { prisma } from "@/lib/db"
import { getLimit, isValidPlan } from "@/lib/plans"

function getTinkClient() {
  return createTinkClient({
    clientId: process.env.TINK_CLIENT_ID!,
    clientSecret: process.env.TINK_CLIENT_SECRET!,
    redirectUri: process.env.TINK_REDIRECT_URI!,
  })
}

/**
 * Generate a Tink Link URL for bank account connection.
 * Checks plan limits before generating the URL.
 */
export async function POST() {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: {
        organizationId: true,
        organization: { select: { planType: true } },
      },
    })

    if (!userOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Check bank connection limit
    const accountCount = await prisma.account.count({
      where: {
        organizationId: userOrg.organizationId,
        status: { not: "disconnected" },
      },
    })

    const plan = isValidPlan(userOrg.organization.planType)
      ? userOrg.organization.planType
      : "starter"

    const maxConnections = getLimit(plan, "maxBankConnections")

    if (accountCount >= maxConnections) {
      return NextResponse.json(
        {
          error: "Bank connection limit reached",
          code: "LIMIT_EXCEEDED",
          limit: maxConnections,
          current: accountCount,
          plan,
        },
        { status: 403 }
      )
    }

    // Encode state to carry user/org context through the redirect
    const state = Buffer.from(
      JSON.stringify({ userId: user.id, organizationId: userOrg.organizationId })
    ).toString("base64url")

    const tink = getTinkClient()
    const url = tink.buildTinkLinkUrl(state)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error creating Tink Link URL:", error)
    return NextResponse.json({ error: "Failed to create bank connection URL" }, { status: 500 })
  }
}
