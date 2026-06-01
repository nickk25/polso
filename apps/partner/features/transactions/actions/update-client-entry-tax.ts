"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, errorResponse } from "@polso/utils"
import type { ActionResponse } from "@polso/utils"

export async function updateClientEntryTaxAction(
  clientId: string,
  transactionId: string,
  taxRate: number | null,
  taxAmount: number | null,
): Promise<ActionResponse<void>> {
  const ctx = await getPartnerAuthContext()
  if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

  const link = await prisma.partnerClient.findFirst({
    where: { partnerId: ctx.organizationId, clientId, status: "active" },
  })
  if (!link) return errorResponse("Acceso no autorizado", "FORBIDDEN")

  const entry = await prisma.entry.findFirst({
    where: { transactionId, organizationId: clientId },
    select: { id: true },
  })
  if (!entry) return errorResponse("Entrada no encontrada", "NOT_FOUND")

  await prisma.entry.update({
    where: { id: entry.id },
    data: { taxRate, taxAmount },
  })

  revalidatePath(`/clients/${clientId}/transactions`)
  return successResponse(undefined)
}
