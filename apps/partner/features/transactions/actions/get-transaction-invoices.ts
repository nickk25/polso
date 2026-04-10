"use server"

import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export interface PartnerInvoice {
  id: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  createdAt: Date
  downloadUrl: string
}

export async function getTransactionInvoicesAction(
  transactionId: string
): Promise<ActionResponse<PartnerInvoice[]>> {
  try {
    const ctx = await getPartnerAuthContext()

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        organization: {
          partnerLinks: {
            some: { partnerId: ctx.organizationId, status: "active" },
          },
        },
      },
      select: {
        expense: {
          select: {
            invoices: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    })

    if (!transaction) return errorResponse("Not found", "NOT_FOUND")

    const invoices = transaction.expense?.invoices ?? []

    return successResponse(
      invoices.map((inv) => ({
        ...inv,
        downloadUrl: `/api/invoices/${inv.id}`,
      }))
    )
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Error al obtener facturas",
      "ERROR"
    )
  }
}
