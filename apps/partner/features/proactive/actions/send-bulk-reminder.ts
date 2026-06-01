"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma, transactionDocumentedWhere } from "@polso/db"
import { sendReminderInternal } from "../lib/send-reminder-internal"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { startOfMonth, endOfMonth } from "date-fns"

export interface BulkReminderResult {
  sent: number
  skipped: number
  reasons: Record<string, number>
}

export async function sendBulkReminderAction(
  scope: "all" | "incomplete",
): Promise<ActionResponse<BulkReminderResult>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const links = await prisma.partnerClient.findMany({
      where: { partnerId: ctx.organizationId, status: "active" },
      select: { clientId: true },
    })

    if (links.length === 0) return successResponse({ sent: 0, skipped: 0, reasons: {} })

    const clientIds = links.map((l) => l.clientId)

    // For "incomplete" scope, compute monthly coverage to find < 100% clients
    let eligibleClientIds = clientIds
    if (scope === "incomplete") {
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      const [totalByClient, documentedByClient] = await Promise.all([
        prisma.transaction.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: clientIds }, date: { gte: monthStart, lte: monthEnd } },
          _count: { id: true },
        }),
        prisma.transaction.groupBy({
          by: ["organizationId"],
          where: {
            organizationId: { in: clientIds },
            date: { gte: monthStart, lte: monthEnd },
            ...transactionDocumentedWhere,
          },
          _count: { id: true },
        }),
      ])

      const totalMap = Object.fromEntries(totalByClient.map((r) => [r.organizationId, r._count.id]))
      const docMap = Object.fromEntries(documentedByClient.map((r) => [r.organizationId, r._count.id]))

      eligibleClientIds = clientIds.filter((id) => {
        const total = totalMap[id] ?? 0
        const documented = docMap[id] ?? 0
        if (total === 0) return false
        return documented < total
      })
    }

    let sent = 0
    let skipped = 0
    const reasons: Record<string, number> = {}

    await Promise.allSettled(
      eligibleClientIds.map(async (clientId) => {
        try {
          const result = await sendReminderInternal(clientId)
          if (result.success) {
            sent++
          } else {
            skipped++
            const code = result.code ?? "error"
            reasons[code] = (reasons[code] ?? 0) + 1
          }
        } catch {
          skipped++
          reasons["error"] = (reasons["error"] ?? 0) + 1
        }
      }),
    )

    return successResponse({ sent, skipped, reasons })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Error al enviar recordatorios",
      "ERROR",
    )
  }
}
