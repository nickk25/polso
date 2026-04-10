"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

interface InviteClientInput {
  clientName: string
  email: string
}

export async function inviteClientAction(
  input: InviteClientInput
): Promise<ActionResponse<{ invitationId: string }>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("FORBIDDEN", "Solo las asesorías pueden invitar clientes")
    }

    // Check if a client org with this name already exists and is linked
    const token = nanoid(32)

    // Create invitation record
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: input.email,
        role: "partner_client",
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        invitedById: ctx.userId,
      },
    })

    revalidatePath("/clients")
    revalidatePath("/")

    return successResponse({ invitationId: invitation.id })
  } catch {
    return errorResponse("ERROR", "No se pudo enviar la invitación")
  }
}

export async function disconnectClientAction(
  clientId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    await prisma.partnerClient.updateMany({
      where: { partnerId: ctx.organizationId, clientId },
      data: { status: "disconnected" },
    })

    revalidatePath("/clients")
    revalidatePath("/")

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo desconectar el cliente")
  }
}
