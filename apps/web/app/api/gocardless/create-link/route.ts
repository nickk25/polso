import { NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getLimit, isValidPlan } from "@/lib/plans"
import { createBankLink } from "@/features/banking/lib/create-bank-link"

/**
 * POST /api/gocardless/create-link
 * Body: { institutionId: string }
 *
 * 1. Checks plan limits
 * 2. Creates end-user agreement (180d access, falls back to 90d)
 * 3. Creates GoCardless requisition → returns link URL
 * 4. Saves pending requisition to DB for the callback to look up
 */
export async function POST(request: Request) {
  try {
    const { user } = await neonAuth()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { institutionId } = await request.json() as { institutionId?: string }
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 })
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

    // Prevent duplicate requisitions for the same bank — each active connection costs money
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        organizationId: userOrg.organizationId,
        institutionId,
        status: { notIn: ["disconnected"] },
      },
      select: { id: true, requisitionId: true },
    })

    if (duplicateAccount) {
      return NextResponse.json(
        {
          error: "DUPLICATE_BANK",
          code: "DUPLICATE_BANK",
          message: "Ya tienes una conexión activa con este banco. Desconecta la anterior antes de reconectar.",
          existingAccountId: duplicateAccount.id,
        },
        { status: 409 }
      )
    }

    const { link } = await createBankLink(userOrg.organizationId, institutionId)

    return NextResponse.json({ link })
  } catch (error) {
    console.error("[GoCardless] Error creating link:", error)
    return NextResponse.json(
      { error: "Failed to create bank connection link" },
      { status: 500 }
    )
  }
}
