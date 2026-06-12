import { NextResponse } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { organizationId } = await getAuthContext()

    // lastSyncedAt: null is the in-progress signal. If a sync died mid-run
    // (function timeout), updatedAt stops moving — treat stale ones as not
    // syncing so the monitor doesn't spin until the next daily cron.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const pendingCount = await prisma.account.count({
      where: {
        organizationId,
        lastSyncedAt: null,
        status: "active",
        updatedAt: { gte: fifteenMinutesAgo },
      },
    })

    const hasError = pendingCount === 0 && await prisma.account.count({
      where: { organizationId, syncError: { not: null }, status: "active" },
    }) > 0

    return NextResponse.json({ syncing: pendingCount > 0, hasError })
  } catch {
    return NextResponse.json({ syncing: false, hasError: false })
  }
}
