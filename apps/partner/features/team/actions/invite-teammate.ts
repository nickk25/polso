"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendUserInvited } from "@polso/email/send"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function inviteTeammateAction(
  email: string
): Promise<ActionResponse<{ invitationId: string }>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden invitar miembros", "FORBIDDEN")
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return errorResponse("Email inválido", "VALIDATION_ERROR")
    }

    const [org, existingAccepted, existingPending] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { name: true, invitationExpiryDays: true },
      }),
      prisma.invitation.findFirst({
        where: { organizationId: ctx.organizationId, email: normalizedEmail, status: "accepted" },
        select: { id: true },
      }),
      prisma.invitation.findFirst({
        where: {
          organizationId: ctx.organizationId,
          email: normalizedEmail,
          role: "admin",
          status: "pending",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      }),
    ])

    if (!org) {
      return errorResponse("No se encontró la organización", "NOT_FOUND")
    }

    if (existingAccepted) {
      return errorResponse("Este usuario ya es miembro del equipo", "DUPLICATE_ERROR")
    }

    if (existingPending) {
      return errorResponse("Ya existe una invitación pendiente para este email", "DUPLICATE_ERROR")
    }

    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * (org.invitationExpiryDays ?? 7))

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        role: "admin",
        token,
        clientName: null,
        expiresAt,
        invitedById: ctx.userId,
      },
    })

    try {
      const { user } = await neonAuth()
      const inviterName = user?.name ?? user?.email ?? "Tu asesoría"
      const result = await sendUserInvited(normalizedEmail, inviterName, org.name, token)

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          resendEmailId: result?.data?.id,
        },
      })
    } catch (emailError) {
      console.error("Failed to send teammate invitation email:", emailError)
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
    }

    revalidatePath("/settings")

    return successResponse({ invitationId: invitation.id })
  } catch {
    return errorResponse("No se pudo enviar la invitación", "ERROR")
  }
}
