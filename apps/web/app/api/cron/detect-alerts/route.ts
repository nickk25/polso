import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  detectLowBalanceAlerts,
  detectHighSpendAlerts,
  detectRunwayCriticalAlerts,
  detectUnusualActivityAlerts,
} from "@/features/alerts/lib/detect-alerts"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Alert detection cron job
 * Runs all 4 detectors for every organization that has at least one active account.
 *
 * Schedule: every 6h (0 *\/6 * * *) — Vercel Hobby plan only allows once daily (0 0 * * *)
 * Security: Requires CRON_SECRET header or query parameter
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization")
  const secretParam = request.nextUrl.searchParams.get("secret")
  const providedSecret = authHeader?.replace("Bearer ", "") || secretParam

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    const result = await runAllDetectors()
    return NextResponse.json({ ...result, duration: Date.now() - startTime })
  } catch (error) {
    console.error("[Cron] detect-alerts error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

interface DetectionResult {
  orgsProcessed: number
  alertsCreated: number
  errors: number
}

async function runAllDetectors(): Promise<DetectionResult> {
  // Find all distinct organizationIds with at least one active account
  const orgs = await prisma.account.findMany({
    where: { status: "active" },
    select: { organizationId: true },
    distinct: ["organizationId"],
  })

  if (orgs.length === 0) {
    console.log("[Cron] detect-alerts: no active organizations found")
    return { orgsProcessed: 0, alertsCreated: 0, errors: 0 }
  }

  console.log(`[Cron] detect-alerts: running for ${orgs.length} organizations`)

  let totalAlertsCreated = 0
  let errors = 0

  for (const { organizationId } of orgs) {
    try {
      const [low, high, runway, unusual] = await Promise.all([
        detectLowBalanceAlerts(organizationId),
        detectHighSpendAlerts(organizationId),
        detectRunwayCriticalAlerts(organizationId),
        detectUnusualActivityAlerts(organizationId),
      ])

      const orgTotal = low + high + runway + unusual
      totalAlertsCreated += orgTotal

      if (orgTotal > 0) {
        console.log(
          `[Cron] org ${organizationId}: created ${orgTotal} alerts (low=${low}, high=${high}, runway=${runway}, unusual=${unusual})`
        )
      }
    } catch (error) {
      console.error(
        `[Cron] detect-alerts error for org ${organizationId}:`,
        error
      )
      errors++
    }
  }

  console.log(
    `[Cron] detect-alerts complete: ${orgs.length} orgs, ${totalAlertsCreated} alerts created, ${errors} errors`
  )

  return {
    orgsProcessed: orgs.length,
    alertsCreated: totalAlertsCreated,
    errors,
  }
}
