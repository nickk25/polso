import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  detectLowBalanceAlerts,
  detectHighSpendAlerts,
  detectRunwayCriticalAlerts,
  detectUnusualActivityAlerts,
  detectMissedRecurringAlerts,
  detectSyncErrorAlerts,
} from "@/features/alerts/lib/detect-alerts"
import { syncTransactionsCore } from "@/features/banking/lib/sync-core"
import { detectPatternsForOrg } from "@/features/intelligence/lib/detect-patterns-core"
import { runClientWeeklyDigests } from "@/features/notifications/lib/run-client-digests"
import { getGoCardlessClient } from "@/features/banking/lib/gocardless-client"

const CRON_SECRET = process.env.CRON_SECRET
const STALE_THRESHOLD_HOURS = 20

export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get("authorization")?.replace("Bearer ", "")

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
  digestsSent: number
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
      digestsSent: 0,
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

  // One sync per org: requisition checks are deduped across accounts sharing
  // a bank connection, and merchant history loads once instead of per account
  const orgGroups = new Map<string, string[]>()
  for (const { id, organizationId } of staleAccounts) {
    const group = orgGroups.get(organizationId) ?? []
    group.push(id)
    orgGroups.set(organizationId, group)
  }

  for (const [organizationId, accountIds] of orgGroups) {
    try {
      const result = await syncTransactionsCore(organizationId, { accountIds })
      if (result.skipped) {
        console.log(`[Cron] Org ${organizationId}: sync already in progress, skipped`)
        continue
      }
      accountsSynced += result.accountsUpdated
      totalImported += result.transactionsImported
      totalModified += result.transactionsModified
      totalEntries += result.entriesCreated
      if (result.accountsUpdated > 0) syncedOrgIds.add(organizationId)
    } catch (error) {
      console.error(`[Cron] Error syncing org ${organizationId}:`, error)
      accountsFailed += accountIds.length
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
      const [low, high, runway, unusual, missed, syncErr] = await Promise.all([
        detectLowBalanceAlerts(orgId),
        detectHighSpendAlerts(orgId),
        detectRunwayCriticalAlerts(orgId),
        detectUnusualActivityAlerts(orgId),
        detectMissedRecurringAlerts(orgId),
        detectSyncErrorAlerts(orgId),
      ])
      alertsCreated += low + high + runway + unusual + missed + syncErr
    } catch (error) {
      console.error(`[Cron] detect-alerts error for org ${orgId}:`, error)
      alertErrors++
    }
  }

  // Monthly requisition cleanup — day 28 UTC, before GoCardless billing cutoff
  const now = new Date()
  if (now.getUTCDate() === 28) {
    try {
      await cleanupExpiredRequisitions()
    } catch (err) {
      console.error("[Cron] cleanupExpiredRequisitions failed:", err)
    }
  }

  // Weekly digest — only on Mondays UTC
  let digestsSent = 0
  if (now.getUTCDay() === 1) {
    try {
      const digestResult = await runClientWeeklyDigests(now)
      digestsSent = digestResult.digestsSent
      console.log(`[Cron] Weekly digests: ${digestsSent} sent, ${digestResult.digestErrors} errors`)
    } catch (err) {
      console.error("[Cron] Weekly digest run failed:", err)
    }
  }

  const duration = Date.now() - startTime
  console.log(
    `[Cron] Done in ${duration}ms: ${accountsSynced} synced, ${totalImported} new txns, ${totalPatterns} patterns, ${alertsCreated} alerts, ${digestsSent} digests`
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
    digestsSent,
    duration,
  }
}

async function cleanupExpiredRequisitions(): Promise<void> {
  const gc = getGoCardlessClient()

  // 1. Find all unique requisitionIds that are disconnected/expired/error but not yet cleaned
  const accounts = await prisma.account.findMany({
    where: {
      status: { in: ["disconnected", "expired", "error"] },
      requisitionId: { not: null },
    },
    select: { requisitionId: true, organizationId: true },
    distinct: ["requisitionId"],
  })

  // 2. Drain pending retry queue (max 5 attempts)
  const retryQueue = await prisma.requisitionCleanupQueue.findMany({
    where: { attempts: { lt: 5 } },
  })

  const allToDelete = [
    ...accounts.map((a) => ({ requisitionId: a.requisitionId!, organizationId: a.organizationId, fromQueue: false })),
    ...retryQueue.map((r) => ({ requisitionId: r.requisitionId, organizationId: r.organizationId, fromQueue: true })),
  ]

  if (allToDelete.length === 0) {
    console.log("[Cron] cleanup: no requisitions to clean up")
    return
  }

  console.log(`[Cron] cleanup: deleting ${allToDelete.length} GoCardless requisitions`)

  for (const { requisitionId, organizationId, fromQueue } of allToDelete) {
    try {
      await gc.deleteRequisition(requisitionId)
      // Clear requisitionId so we don't retry next month
      await prisma.account.updateMany({
        where: { requisitionId, organizationId },
        data: { requisitionId: null },
      })
      if (fromQueue) {
        await prisma.requisitionCleanupQueue.delete({ where: { requisitionId } }).catch(() => {})
      }
      console.log(`[Cron] cleanup: deleted requisition ${requisitionId}`)
    } catch (err) {
      console.error(`[Cron] cleanup: failed to delete ${requisitionId}:`, err)
      await prisma.requisitionCleanupQueue.upsert({
        where: { requisitionId },
        create: { requisitionId, organizationId, attempts: 1, lastAttemptAt: new Date(), lastError: String(err) },
        update: { attempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: String(err) },
      }).catch(() => {})
    }
  }
}
