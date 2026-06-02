"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

async function verifyLink(partnerId: string, clientId: string) {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  return !!link
}

export async function bulkUpdateClientEntryStatusAction(
  clientId: string,
  transactionIds: string[],
  status: "pending" | "verified" | "excluded",
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")
    if (!(await verifyLink(ctx.organizationId, clientId))) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    await prisma.entry.updateMany({
      where: { transactionId: { in: transactionIds }, organizationId: clientId },
      data: { status },
    })

    revalidatePath(`/clients/${clientId}/transactions`)
    return successResponse(undefined)
  } catch {
    return errorResponse("Error al actualizar estado", "ERROR")
  }
}

export async function bulkUpdateClientEntryTypeAction(
  clientId: string,
  transactionIds: string[],
  entryType: "fixed" | "variable",
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")
    if (!(await verifyLink(ctx.organizationId, clientId))) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    await prisma.entry.updateMany({
      where: { transactionId: { in: transactionIds }, organizationId: clientId },
      data: { entryType },
    })

    revalidatePath(`/clients/${clientId}/transactions`)
    return successResponse(undefined)
  } catch {
    return errorResponse("Error al actualizar tipo", "ERROR")
  }
}

export async function bulkUpdateClientEntryTaxAction(
  clientId: string,
  transactionIds: string[],
  taxRate: number | null,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")
    if (!(await verifyLink(ctx.organizationId, clientId))) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    if (taxRate === null) {
      await prisma.entry.updateMany({
        where: { transactionId: { in: transactionIds }, organizationId: clientId },
        data: { taxRate: null, taxAmount: null },
      })
    } else {
      const entries = await prisma.entry.findMany({
        where: { transactionId: { in: transactionIds }, organizationId: clientId },
        select: { id: true, transaction: { select: { amount: true } } },
      })

      await Promise.all(
        entries
          .filter((entry) => entry.transaction !== null)
          .map((entry) => {
            const gross = Math.abs(entry.transaction!.amount)
            const taxAmount = Math.round((gross * taxRate / (1 + taxRate)) * 100) / 100
            return prisma.entry.update({
              where: { id: entry.id },
              data: { taxRate, taxAmount },
            })
          }),
      )
    }

    revalidatePath(`/clients/${clientId}/transactions`)
    return successResponse(undefined)
  } catch {
    return errorResponse("Error al actualizar IVA", "ERROR")
  }
}
