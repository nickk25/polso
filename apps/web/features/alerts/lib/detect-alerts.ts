import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import {
  sendLowBalanceAlert,
  sendHighSpendAlert,
  sendRunwayCriticalAlert,
  sendUnusualActivityAlert,
  sendMissingRecurringAlert,
  sendSyncError,
} from "@/lib/email/send"
import type { Locale } from "@/lib/i18n/config"
import { detectAnomalies } from "@polso/intelligence"

// ============================================================================
// Low Balance Detection
// ============================================================================

/**
 * Detects accounts whose current balance has fallen below the org users'
 * configured lowBalanceThreshold. Creates one alert per account per 24h.
 */
export async function detectLowBalanceAlerts(organizationId: string): Promise<number> {
  let created = 0

  // Get all active accounts with a balance
  const accounts = await prisma.account.findMany({
    where: { organizationId, status: "active" },
    select: {
      id: true,
      name: true,
      balanceCurrent: true,
      currency: true,
    },
  })

  if (accounts.length === 0) return 0

  // Get all users in this org with their notification settings
  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({
        where: { userId },
      })
      const userRecord = await prisma.userOrganization.findFirst({
        where: { userId, organizationId },
      })
      return { userId, settings, userRecord }
    })
  )

  // Find users with a lowBalanceThreshold configured
  const alertableUsers = userSettings.filter(
    (u) => u.settings?.lowBalanceThreshold != null && u.settings.lowBalanceThreshold > 0
  )

  if (alertableUsers.length === 0) return 0

  const createInApp = await orgWantsInAppAlerts(organizationId)

  for (const account of accounts) {
    if (account.balanceCurrent === null) continue

    // Use the lowest configured threshold across all users (most conservative)
    const thresholds = alertableUsers
      .map((u) => u.settings!.lowBalanceThreshold!)
      .filter((t) => t > 0)
    const threshold = Math.max(...thresholds) // alert if ANY user's threshold is breached

    if (account.balanceCurrent >= threshold) continue

    // Deduplication: skip if a non-dismissed alert for this account already exists in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existing = await prisma.alert.findFirst({
      where: {
        organizationId,
        type: "low_balance",
        accountId: account.id,
        isDismissed: false,
        createdAt: { gte: since },
      },
    })
    if (existing) continue

    const severity =
      account.balanceCurrent < threshold * 0.5 ? "critical" : "warning"

    if (createInApp) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "low_balance",
          title: `Low balance: ${account.name}`,
          message: `${account.name} balance is ${formatAmount(account.balanceCurrent, account.currency)}, below your ${formatAmount(threshold, account.currency)} threshold.`,
          severity,
          accountId: account.id,
          metadata: {
            accountName: account.name,
            currentBalance: account.balanceCurrent,
            threshold,
            currency: account.currency,
          },
        },
      })
      created++
    }

    // Send email to users who have emailAlerts + emailLowBalance enabled
    for (const { userId, settings } of alertableUsers) {
      if (!settings?.emailAlerts || !settings?.emailLowBalance) continue
      if (!settings?.lowBalanceThreshold || account.balanceCurrent >= settings.lowBalanceThreshold) continue

      const user = await prisma.userOrganization.findFirst({
        where: { userId, organizationId },
      })
      if (!user) continue

      // Get user email from auth tables
      const authUser = await prisma.$queryRaw<{ email: string; name: string; locale?: string }[]>`
        SELECT u.email, u.name, up.locale
        FROM neon_auth.users_sync u
        LEFT JOIN user_preferences up ON up.user_id = u.id
        WHERE u.id = ${userId}
        LIMIT 1
      `.catch(() => [] as { email: string; name: string; locale?: string }[])

      if (!authUser[0]?.email) continue

      const locale = (authUser[0].locale as Locale) || "en"
      const name = authUser[0].name || authUser[0].email

      await sendLowBalanceAlert(
        authUser[0].email,
        name,
        account.name,
        formatAmount(account.balanceCurrent, account.currency),
        formatAmount(settings.lowBalanceThreshold, account.currency),
        locale
      ).catch(console.error)
    }
  }

  return created
}

// ============================================================================
// High Spend Detection
// ============================================================================

/**
 * Detects when a category's total spend this month exceeds any user's
 * configured highExpenseThreshold. One alert per category per calendar month.
 */
export async function detectHighSpendAlerts(organizationId: string): Promise<number> {
  let created = 0

  // Get this month's spend per category
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const categorySpend = await prisma.entry.groupBy({
    by: ["categoryId"],
    where: {
      organizationId,
      direction: "expense",
      date: { gte: monthStart, lte: monthEnd },
      status: { not: "excluded" },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  })

  if (categorySpend.length === 0) return 0

  // Get org users' thresholds
  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({ where: { userId } })
      return { userId, settings }
    })
  )

  const alertableUsers = userSettings.filter(
    (u) => u.settings?.highExpenseThreshold != null && u.settings.highExpenseThreshold > 0
  )

  if (alertableUsers.length === 0) return 0

  const createInApp = await orgWantsInAppAlerts(organizationId)

  const maxThreshold = Math.max(
    ...alertableUsers.map((u) => u.settings!.highExpenseThreshold!)
  )

  for (const { categoryId, _sum } of categorySpend) {
    if (!categoryId || !_sum.amount) continue
    if (_sum.amount < maxThreshold) continue

    // Deduplication: one per category per calendar month
    const monthKey = format(now, "yyyy-MM")
    const existing = await prisma.alert.findFirst({
      where: {
        organizationId,
        type: "high_expense",
        isDismissed: false,
        metadata: { path: ["monthKey"], equals: monthKey },
        // Also check categoryId in metadata
      },
    })

    // Fallback check using raw metadata match
    const existingAlerts = await prisma.alert.findMany({
      where: {
        organizationId,
        type: "high_expense",
        isDismissed: false,
        createdAt: { gte: monthStart },
      },
      select: { metadata: true },
    })
    const alreadyAlerted = existingAlerts.some((a) => {
      const meta = a.metadata as Record<string, unknown> | null
      return meta?.categoryId === categoryId
    })
    if (alreadyAlerted || existing) continue

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    })
    if (!category) continue

    const severity = _sum.amount > maxThreshold * 1.5 ? "critical" : "warning"
    const currency = "USD" // Will be pulled from org account if needed

    if (createInApp) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "high_expense",
          title: `High spend: ${category.name}`,
          message: `${category.name} spending reached ${formatAmount(_sum.amount, currency)} this month, exceeding your threshold.`,
          severity,
          metadata: {
            categoryId,
            categoryName: category.name,
            amount: _sum.amount,
            threshold: maxThreshold,
            monthKey,
            currency,
          },
        },
      })
      created++
    }

    // Send emails
    for (const { userId, settings } of alertableUsers) {
      if (!settings?.emailAlerts || !settings?.emailHighSpend) continue
      if (!settings?.highExpenseThreshold || _sum.amount < settings.highExpenseThreshold) continue

      const authUser = await getUserEmailAndLocale(userId)
      if (!authUser) continue

      await sendHighSpendAlert(
        authUser.email,
        authUser.name,
        category.name,
        formatAmount(_sum.amount, currency),
        formatAmount(settings.highExpenseThreshold, currency),
        format(now, "MMMM yyyy"),
        authUser.locale
      ).catch(console.error)
    }
  }

  return created
}

// ============================================================================
// Runway Critical Detection
// ============================================================================

/**
 * Detects when the organization's cash runway drops below the configured
 * runwayThreshold (in months). One alert per 7 days.
 */
export async function detectRunwayCriticalAlerts(organizationId: string): Promise<number> {
  // Calculate runway inline (no auth context available in cron)
  const accounts = await prisma.account.findMany({
    where: { organizationId, status: "active" },
    select: { balanceCurrent: true, currency: true },
  })

  if (accounts.length === 0) return 0

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balanceCurrent || 0), 0)
  const currency = accounts[0]?.currency || "USD"

  const now = new Date()
  const threeMonthsAgo = startOfMonth(subMonths(now, 3))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const monthlyExpenses = await prisma.entry.groupBy({
    by: ["date"],
    where: {
      organizationId,
      direction: "expense",
      date: { gte: threeMonthsAgo, lte: lastMonthEnd },
      status: { not: "excluded" },
    },
    _sum: { amount: true },
  })

  const monthlyTotals = new Map<string, number>()
  for (const expense of monthlyExpenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")
    const current = monthlyTotals.get(monthKey) || 0
    monthlyTotals.set(monthKey, current + (expense._sum.amount || 0))
  }

  const monthCount = monthlyTotals.size || 1
  const totalSpent = Array.from(monthlyTotals.values()).reduce((sum, v) => sum + v, 0)
  const burnRate = totalSpent / monthCount
  const runway = burnRate > 0 ? totalBalance / burnRate : 0

  // Get org users' thresholds
  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({ where: { userId } })
      return { userId, settings }
    })
  )

  const alertableUsers = userSettings.filter((u) => {
    const threshold = u.settings?.runwayThreshold ?? 3
    return runway < threshold
  })

  if (alertableUsers.length === 0) return 0

  // Deduplication: one per 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const existing = await prisma.alert.findFirst({
    where: {
      organizationId,
      type: "runway_warning",
      isDismissed: false,
      createdAt: { gte: since },
    },
  })
  if (existing) return 0

  const createInApp = await orgWantsInAppAlerts(organizationId)
  const severity = runway < 1 ? "critical" : "warning"
  const runwayRounded = Math.round(runway * 10) / 10
  let created = 0

  if (createInApp) {
    await prisma.alert.create({
      data: {
        organizationId,
        type: "runway_warning",
        title: `Cash runway critical: ${runwayRounded} months`,
        message: `At your current burn rate of ${formatAmount(burnRate, currency)}/month, you have approximately ${runwayRounded} months of runway remaining.`,
        severity,
        metadata: {
          runway: runwayRounded,
          burnRate,
          totalBalance,
          currency,
        },
      },
    })
    created = 1
  }

  // Send emails
  for (const { userId, settings } of alertableUsers) {
    if (!settings?.emailAlerts || !settings?.emailRunwayCritical) continue

    const authUser = await getUserEmailAndLocale(userId)
    if (!authUser) continue

    const threshold = settings.runwayThreshold ?? 3

    await sendRunwayCriticalAlert(
      authUser.email,
      authUser.name,
      String(runwayRounded),
      String(threshold),
      formatAmount(totalBalance, currency),
      formatAmount(burnRate, currency),
      authUser.locale
    ).catch(console.error)
  }

  return created
}

// ============================================================================
// Unusual Activity Detection
// ============================================================================

/**
 * Detects individual expenses that are significantly higher than the category's
 * historical average (based on each user's unusualMultiplier setting).
 * One alert per expense — never re-alerts the same expense.
 */
export async function detectUnusualActivityAlerts(organizationId: string): Promise<number> {
  let created = 0

  // Get org users' multiplier settings
  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({ where: { userId } })
      return { userId, settings }
    })
  )

  const alertableUsers = userSettings.filter((u) => u.settings?.emailAlerts !== false)
  if (alertableUsers.length === 0) return 0

  const multiplier = Math.min(
    ...alertableUsers.map((u) => u.settings?.unusualMultiplier ?? 2)
  )

  // Get expenses from the last 7 days (newly synced)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentExpenses = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      createdAt: { gte: since },
      status: { not: "excluded" },
      categoryId: { not: null },
    },
    select: {
      id: true,
      amount: true,
      description: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  })

  if (recentExpenses.length === 0) return 0

  const createInApp = await orgWantsInAppAlerts(organizationId)

  // Get already-alerted entry IDs to avoid re-alerting
  const alertedEntryIds = await prisma.alert.findMany({
    where: { organizationId, type: "unusual_activity" },
    select: { entryId: true },
  })
  const alertedIds = new Set(alertedEntryIds.map((a) => a.entryId).filter(Boolean))

  // Batch-fetch category averages for last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const candidateExpenses = recentExpenses.filter((e) => e.categoryId && !alertedIds.has(e.id))
  const categoryIds = [...new Set(candidateExpenses.map((e) => e.categoryId!))]

  const categoryAverages = await prisma.entry.groupBy({
    by: ["categoryId"],
    where: {
      organizationId,
      direction: "expense",
      categoryId: { in: categoryIds },
      status: { not: "excluded" },
      date: { gte: ninetyDaysAgo },
    },
    _avg: { amount: true },
    _count: { id: true },
  })

  const avgMap = new Map(
    categoryAverages.map((r) => [r.categoryId!, { avg: r._avg.amount ?? 0, count: r._count.id }])
  )

  const inputs = candidateExpenses
    .filter((e) => avgMap.has(e.categoryId!))
    .map((e) => {
      const stats = avgMap.get(e.categoryId!)!
      return {
        id: e.id,
        amount: e.amount,
        description: e.description,
        categoryId: e.categoryId!,
        categoryName: e.category?.name ?? null,
        categoryAvg: stats.avg,
        categoryCount: stats.count,
      }
    })

  const anomalies = detectAnomalies(inputs, { multiplier })

  for (const anomaly of anomalies) {
    const expense = candidateExpenses.find((e) => e.id === anomaly.entryId)!
    const actualMultiplier = Math.round((anomaly.amount / anomaly.categoryAvg) * 10) / 10
    const currency = "USD"

    if (createInApp) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "unusual_activity",
          title: `Unusual expense: ${anomaly.categoryName}`,
          message: `An expense of ${formatAmount(anomaly.amount, currency)} in ${anomaly.categoryName} is ${actualMultiplier}x your typical average of ${formatAmount(anomaly.categoryAvg, currency)}.`,
          severity: "warning",
          entryId: anomaly.entryId,
          metadata: {
            entryDescription: expense.description,
            amount: anomaly.amount,
            averageAmount: anomaly.categoryAvg,
            multiplier: actualMultiplier,
            categoryName: anomaly.categoryName,
            currency,
          },
        },
      })
      created++
    }

    // Send emails
    for (const { userId, settings } of alertableUsers) {
      if (!settings?.emailAlerts || !settings?.emailUnusualActivity) continue

      const userMultiplier = settings.unusualMultiplier ?? 2
      if (anomaly.amount < anomaly.categoryAvg * userMultiplier) continue

      const authUser = await getUserEmailAndLocale(userId)
      if (!authUser) continue

      await sendUnusualActivityAlert(
        authUser.email,
        authUser.name,
        anomaly.categoryName,
        formatAmount(anomaly.amount, currency),
        formatAmount(anomaly.categoryAvg, currency),
        String(actualMultiplier),
        authUser.locale
      ).catch(console.error)
    }
  }

  return created
}

// ============================================================================
// Missed Recurring Detection
// ============================================================================

function getNextExpectedDate(lastOccurrence: Date, frequency: string, expectedDayOfMonth: number | null): Date {
  const next = new Date(lastOccurrence)
  switch (frequency) {
    case "weekly": next.setDate(next.getDate() + 7); break
    case "biweekly": next.setDate(next.getDate() + 14); break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      if (expectedDayOfMonth) next.setDate(expectedDayOfMonth)
      break
    case "quarterly": next.setMonth(next.getMonth() + 3); break
    case "yearly": next.setFullYear(next.getFullYear() + 1); break
    default: next.setMonth(next.getMonth() + 1)
  }
  return next
}

/**
 * Detects confirmed recurring patterns whose next expected payment is overdue
 * (past grace period). Creates one alert per pattern per 14 days.
 */
export async function detectMissedRecurringAlerts(organizationId: string): Promise<number> {
  const gracePeriodDays = 7
  const deduplicationDays = 14
  const today = new Date()

  const patterns = await prisma.recurringPattern.findMany({
    where: { organizationId, isConfirmed: true, lastOccurrence: { not: null } },
    select: {
      id: true,
      name: true,
      frequency: true,
      expectedAmount: true,
      expectedDayOfMonth: true,
      lastOccurrence: true,
      counterparty: { select: { name: true } },
    },
  })

  if (patterns.length === 0) return 0

  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({ where: { userId } })
      return { userId, settings }
    })
  )

  const alertableUsers = userSettings.filter((u) => u.settings?.emailAlerts !== false)
  if (alertableUsers.length === 0) return 0

  const createInApp = await orgWantsInAppAlerts(organizationId)
  let created = 0

  for (const pattern of patterns) {
    if (!pattern.lastOccurrence) continue

    const nextExpected = getNextExpectedDate(pattern.lastOccurrence, pattern.frequency, pattern.expectedDayOfMonth)
    const graceCutoff = new Date(nextExpected)
    graceCutoff.setDate(graceCutoff.getDate() + gracePeriodDays)

    if (today <= graceCutoff) continue

    const since = new Date(Date.now() - deduplicationDays * 24 * 60 * 60 * 1000)
    const existing = await prisma.alert.findFirst({
      where: {
        organizationId,
        type: "missed_recurring",
        isDismissed: false,
        createdAt: { gte: since },
        metadata: { path: ["recurringPatternId"], equals: pattern.id },
      },
    })
    if (existing) continue

    const vendorName = pattern.counterparty?.name || pattern.name
    const currency = "EUR"

    if (createInApp) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "missed_recurring",
          severity: "warning",
          title: `Missed recurring: ${vendorName}`,
          message: `Expected payment of ${formatAmount(pattern.expectedAmount ?? 0, currency)} from ${vendorName} is overdue.`,
          recurringPatternId: pattern.id,
          metadata: {
            recurringPatternId: pattern.id,
            vendorName,
            expectedAmount: pattern.expectedAmount ?? 0,
            expectedDate: nextExpected.toISOString(),
            frequency: pattern.frequency,
          },
        },
      })
      created++
    }

    for (const { userId } of alertableUsers) {
      const authUser = await getUserEmailAndLocale(userId)
      if (!authUser) continue

      await sendMissingRecurringAlert(
        authUser.email,
        authUser.name,
        vendorName,
        formatAmount(pattern.expectedAmount ?? 0, currency),
        format(nextExpected, "MMM d, yyyy"),
        authUser.locale
      ).catch(console.error)
    }
  }

  return created
}

// ============================================================================
// Sync Error Detection
// ============================================================================

/**
 * Detects accounts with a persisted syncError and creates one alert per
 * account per 24h. Also emails users with emailSyncErrors enabled.
 */
export async function detectSyncErrorAlerts(organizationId: string): Promise<number> {
  let created = 0

  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      syncError: { not: null },
      status: { in: ["error", "expired"] },
    },
    select: { id: true, name: true, syncError: true },
  })

  if (accounts.length === 0) return 0

  const orgUsers = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })

  const userSettings = await Promise.all(
    orgUsers.map(async ({ userId }) => {
      const settings = await prisma.notificationSetting.findUnique({ where: { userId } })
      return { userId, settings }
    })
  )

  const createInApp = await orgWantsInAppAlerts(organizationId)

  for (const account of accounts) {
    if (!account.syncError) continue

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existing = await prisma.alert.findFirst({
      where: {
        organizationId,
        type: "sync_error",
        accountId: account.id,
        isDismissed: false,
        createdAt: { gte: since },
      },
    })
    if (existing) continue

    if (createInApp) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "sync_error",
          title: `Sync error: ${account.name}`,
          message: `${account.name} could not be synced: ${account.syncError}`,
          severity: "warning",
          accountId: account.id,
          metadata: { bankName: account.name, errorMessage: account.syncError },
        },
      })
      created++
    }

    for (const { userId, settings } of userSettings) {
      if (!settings?.emailAlerts || !settings?.emailSyncErrors) continue

      const authUser = await getUserEmailAndLocale(userId)
      if (!authUser) continue

      await sendSyncError(
        authUser.email,
        authUser.name,
        account.name,
        account.syncError,
        authUser.locale
      ).catch(console.error)
    }
  }

  return created
}

// ============================================================================
// Helpers
// ============================================================================

async function orgWantsInAppAlerts(organizationId: string): Promise<boolean> {
  const memberships = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: { userId: true },
  })
  if (memberships.length === 0) return false
  const enabled = await prisma.notificationSetting.count({
    where: {
      userId: { in: memberships.map((m) => m.userId) },
      inAppAlerts: true,
    },
  })
  return enabled > 0
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export async function getUserEmailAndLocale(
  userId: string
): Promise<{ email: string; name: string; locale: Locale } | null> {
  try {
    const result = await prisma.$queryRaw<
      { email: string; name: string; locale?: string }[]
    >`
      SELECT u.email, u.name, up.locale
      FROM neon_auth.users_sync u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.id = ${userId}
      LIMIT 1
    `
    if (!result[0]?.email) return null
    return {
      email: result[0].email,
      name: result[0].name || result[0].email,
      locale: (result[0].locale as Locale) || "en",
    }
  } catch {
    return null
  }
}
