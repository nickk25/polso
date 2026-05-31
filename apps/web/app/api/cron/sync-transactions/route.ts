import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  detectLowBalanceAlerts,
  detectHighSpendAlerts,
  detectRunwayCriticalAlerts,
  detectUnusualActivityAlerts,
  detectMissedRecurringAlerts,
} from "@/features/alerts/lib/detect-alerts"
import { syncTransactionsCore } from "@/features/banking/lib/sync-core"
import { detectPatternsForOrg } from "@/features/intelligence/lib/detect-patterns-core"

const CRON_SECRET = process.env.CRON_SECRET
const STALE_THRESHOLD_HOURS = 20

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const secretParam = request.nextUrl.searchParams.get("secret")
  const providedSecret = authHeader?.replace("Bearer ", "") || secretParam

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncAllAccounts()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Cron] Sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

interface CronSyncResult {
  accountsSynced: number
  accountsFailed: number
  transactionsImported: number
  transactionsModified: number
  entriesCreated: number
  patternsDetected: number
  alertsCreated: number
  alertErrors: number
  duration: number
}

async function syncAllAccounts(): Promise<CronSyncResult> {
  const startTime = Date.now()
  const staleDate = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)

  // Only accounts not recently synced — respects GoCardless rate limits (4 calls/day/endpoint)
  const staleAccounts = await prisma.account.findMany({
    where: {
      status: "active",
      requisitionId: { not: null },
      externalAccountId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleDate } }],
    },
    select: { id: true, organizationId: true },
  })

  if (staleAccounts.length === 0) {
    return {
      accountsSynced: 0,
      accountsFailed: 0,
      transactionsImported: 0,
      transactionsModified: 0,
      entriesCreated: 0,
      patternsDetected: 0,
      alertsCreated: 0,
      alertErrors: 0,
      duration: Date.now() - startTime,
    }
  }

  console.log(`[Cron] Syncing ${staleAccounts.length} stale accounts`)

  let accountsSynced = 0
  let accountsFailed = 0
  let totalImported = 0
  let totalModified = 0
  let totalEntries = 0
  let totalPatterns = 0
  const syncedOrgIds = new Set<string>()

  for (const { id: accountId, organizationId } of staleAccounts) {
    try {
      const result = await syncTransactionsCore(organizationId, accountId)
      accountsSynced += result.accountsUpdated
      totalImported += result.transactionsImported
      totalModified += result.transactionsModified
      totalEntries += result.entriesCreated
      if (result.accountsUpdated > 0) syncedOrgIds.add(organizationId)
    } catch (error) {
      console.error(`[Cron] Error syncing account ${accountId}:`, error)
      accountsFailed++
    }
  }

  // Pattern detection + alerts for all orgs that had accounts synced
  let alertsCreated = 0
  let alertErrors = 0

  for (const orgId of syncedOrgIds) {
    try {
      const patterns = await detectPatternsForOrg(orgId)
      totalPatterns += patterns.patternsDetected
    } catch (error) {
      console.error(`[Cron] detect-patterns error for org ${orgId}:`, error)
    }

    try {
      const [low, high, runway, unusual, missed] = await Promise.all([
        detectLowBalanceAlerts(orgId),
        detectHighSpendAlerts(orgId),
        detectRunwayCriticalAlerts(orgId),
        detectUnusualActivityAlerts(orgId),
        detectMissedRecurringAlerts(orgId),
      ])
      alertsCreated += low + high + runway + unusual + missed
    } catch (error) {
      console.error(`[Cron] detect-alerts error for org ${orgId}:`, error)
      alertErrors++
    }
  }

  const duration = Date.now() - startTime
  console.log(
    `[Cron] Done in ${duration}ms: ${accountsSynced} synced, ${totalImported} new txns, ${totalPatterns} patterns, ${alertsCreated} alerts`
  )

  return {
    accountsSynced,
    accountsFailed,
    transactionsImported: totalImported,
    transactionsModified: totalModified,
    entriesCreated: totalEntries,
    patternsDetected: totalPatterns,
    alertsCreated,
    alertErrors,
    duration,
  }
}
