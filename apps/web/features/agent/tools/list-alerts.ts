import { tool } from "ai"
import { z } from "zod"
import { getAlerts } from "@/features/alerts/queries/get-alerts"
import { truncate } from "../lib/tool-output"

export const listAlerts = tool({
  description: "List financial alerts (low balance, high spend, unusual activity, missed recurring payments, etc.).",
  parameters: z.object({
    isRead: z.boolean().optional().describe("Filter by read status. Omit to return all."),
    severity: z.enum(["critical", "warning", "info"]).optional().describe("Filter by severity"),
    limit: z.number().min(1).max(50).default(20).optional(),
  }),
  execute: async ({ isRead, severity, limit }) => {
    const result = await getAlerts({ isRead, severity }, 1, limit ?? 20)
    return {
      alerts: truncate(
        result.alerts.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          message: a.message,
          severity: a.severity,
          isRead: a.isRead,
          createdAt: a.createdAt,
        }))
      ),
      total: result.total,
    }
  },
})
