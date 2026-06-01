"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export interface UpdateClientEntryInput {
  status?: "pending" | "verified" | "excluded"
  counterpartyId?: string | null
  notes?: string | null
}

export async function updateClientEntryAction(
  clientId: string,
  transactionId: string,
  input: UpdateClientEntryInput,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId, status: "active" },
    })
    if (!link) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    if (input.counterpartyId) {
      const cp = await prisma.counterparty.findFirst({
        where: { id: input.counterpartyId, organizationId: clientId },
        select: { id: true },
      })
      if (!cp) return errorResponse("Proveedor no encontrado", "NOT_FOUND")
    }

    const entry = await prisma.entry.findFirst({
      where: { transactionId, organizationId: clientId },
      select: { id: true },
    })
    if (!entry) return errorResponse("Entrada no encontrada", "NOT_FOUND")

    const data: { status?: string; counterpartyId?: string | null; notes?: string | null } = {}
    if (input.status !== undefined) data.status = input.status
    if (input.counterpartyId !== undefined) data.counterpartyId = input.counterpartyId
    if (input.notes !== undefined) data.notes = input.notes

    await prisma.entry.update({ where: { id: entry.id }, data })

    revalidatePath(`/clients/${clientId}/transactions`)
    return successResponse(undefined)
  } catch (error) {
    console.error("updateClientEntry error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al actualizar",
      "ERROR"
    )
  }
}
