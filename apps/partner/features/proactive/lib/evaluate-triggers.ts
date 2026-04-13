import { prisma } from "@/lib/db"
import type { MessageType, ProactiveContext } from "@polso/agent/proactive"
import {
  getUnmatchedTransactions,
  getWeeklySummary,
  getMonthlySummary,
  getAnomalies,
} from "./gather-context"

interface TriggerResult {
  messageType: MessageType
  context: ProactiveContext
}

export async function evaluateTriggers(
  organizationId: string,
  orgName: string,
  now: Date
): Promise<TriggerResult | null> {
  const dayOfMonth = now.getDate()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon

  // Priority 1: Monthly summary (day 1)
  if (dayOfMonth === 1) {
    const alreadySent = await wasSentWithin(organizationId, "monthly_summary", 24)
    if (!alreadySent) {
      const summary = await getMonthlySummary(organizationId)
      if (summary.totalTransactions > 0) {
        return {
          messageType: "monthly_summary",
          context: { orgName, messageType: "monthly_summary", summary },
        }
      }
    }
  }

  // Priority 2: Weekly summary (Monday)
  if (dayOfWeek === 1) {
    const alreadySent = await wasSentWithin(organizationId, "weekly_summary", 24)
    if (!alreadySent) {
      const summary = await getWeeklySummary(organizationId)
      if (summary.totalTransactions > 0) {
        return {
          messageType: "weekly_summary",
          context: { orgName, messageType: "weekly_summary", summary },
        }
      }
    }
  }

  // Priority 3: Anomaly alerts
  const alreadySentAnomaly = await wasSentWithin(organizationId, "anomaly_alert", 24)
  if (!alreadySentAnomaly) {
    const { anomalies, missingRecurring } = await getAnomalies(organizationId)
    if (anomalies.length > 0 || missingRecurring.length > 0) {
      return {
        messageType: "anomaly_alert",
        context: { orgName, messageType: "anomaly_alert", anomalies, missingRecurring },
      }
    }
  }

  // Priority 4: Receipt reminder
  const alreadySentReminder = await wasSentWithin(organizationId, "receipt_reminder", 48)
  if (!alreadySentReminder) {
    const unmatched = await getUnmatchedTransactions(organizationId)
    if (unmatched.length > 0) {
      return {
        messageType: "receipt_reminder",
        context: { orgName, messageType: "receipt_reminder", unmatchedTransactions: unmatched },
      }
    }
  }

  return null
}

async function wasSentWithin(
  organizationId: string,
  messageType: MessageType,
  hours: number
): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  const existing = await prisma.proactiveMessage.findFirst({
    where: { organizationId, messageType, sentAt: { gte: since } },
    select: { id: true },
  })
  return existing !== null
}
