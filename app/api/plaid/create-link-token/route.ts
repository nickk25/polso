import { NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { createLinkToken } from "@/features/banking/lib/plaid-client"
import { Products, CountryCode } from "plaid"
import { prisma } from "@/lib/db"
import { getLimit, isValidPlan } from "@/lib/plans"

export async function POST() {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user's organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: {
        organizationId: true,
        organization: {
          select: { planType: true },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
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

    const linkTokenResponse = await createLinkToken({
      userId: user.id,
      products: [Products.Transactions],
      countryCodes: [CountryCode.Us],
    })

    return NextResponse.json({
      linkToken: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    })
  } catch (error) {
    console.error("Error creating link token:", error)
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    )
  }
}
