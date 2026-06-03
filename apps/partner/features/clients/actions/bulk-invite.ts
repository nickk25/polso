"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendPartnerClientInvited } from "@polso/email/send"

export interface BulkInviteRowResult {
  email: string
  clientName: string
  status: "sent" | "skipped" | "failed"
  reason?: string
}

export interface BulkInviteResult {
  sent: number
  skipped: number
  failed: number
  results: BulkInviteRowResult[]
}

const CHUNK_SIZE = 5

async function processRow(
  row: { clientName: string; email: string },
  ctx: { organizationId: string; userId: string },
  partnerOrgName: string,
  partnerName: string,
  invitationExpiryDays: number,
): Promise<BulkInviteRowResult> {
  const token = nanoid(32)

  let invitationId: string
  try {
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: row.email,
        role: "partner_client",
        token,
        clientName: row.clientName,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * invitationExpiryDays),
        invitedById: ctx.userId,
      },
    })
    invitationId = invitation.id
  } catch (err) {
    return {
      email: row.email,
      clientName: row.clientName,
      status: "failed",
      reason: `db_error: ${err instanceof Error ? err.message : "unknown"}`,
    }
  }

  try {
    const result = await sendPartnerClientInvited(
      row.email,
      partnerName,
      partnerOrgName,
      row.clientName,
      token,
    )

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        emailStatus: "sent",
        emailSentAt: new Date(),
        resendEmailId: result?.data?.id,
      },
    })

    return { email: row.email, clientName: row.clientName, status: "sent" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        emailStatus: "failed",
        emailError: message,
      },
    })
    return {
      email: row.email,
      clientName: row.clientName,
      status: "failed",
      reason: `send_error: ${message}`,
    }
  }
}

export async function bulkInviteClientsAction(input: {
  rows: Array<{ clientName: string; email: string }>
}): Promise<ActionResponse<BulkInviteResult>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden invitar clientes", "FORBIDDEN")
    }

    const { rows } = input

    if (rows.length === 0) {
      return errorResponse("No hay filas para enviar", "VALIDATION_ERROR")
    }
    if (rows.length > 100) {
      return errorResponse("Máximo 100 invitaciones por lote", "VALIDATION_ERROR")
    }

    const { user } = await neonAuth()
    const partnerOrg = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, invitationExpiryDays: true },
    })

    if (!partnerOrg) {
      return errorResponse("No se encontró la organización", "NOT_FOUND")
    }

    const partnerName = user?.name ?? user?.email ?? "Tu asesoría"
    const partnerOrgName = partnerOrg.name

    // Within-list dedup (first occurrence wins)
    const results: BulkInviteRowResult[] = []
    const seenEmails = new Set<string>()
    const uniqueRows: Array<{ clientName: string; email: string }> = []

    for (const row of rows) {
      if (seenEmails.has(row.email)) {
        results.push({
          email: row.email,
          clientName: row.clientName,
          status: "skipped",
          reason: "duplicate_in_list",
        })
      } else {
        seenEmails.add(row.email)
        uniqueRows.push(row)
      }
    }

    // DB pre-check: skip emails with existing pending invites
    const existingInvites = await prisma.invitation.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: "partner_client",
        email: { in: uniqueRows.map((r) => r.email) },
        status: "pending",
      },
      select: { email: true },
    })
    const alreadyInvited = new Set(existingInvites.map((i) => i.email))

    const toSend: Array<{ clientName: string; email: string }> = []
    for (const row of uniqueRows) {
      if (alreadyInvited.has(row.email)) {
        results.push({
          email: row.email,
          clientName: row.clientName,
          status: "skipped",
          reason: "already_invited",
        })
      } else {
        toSend.push(row)
      }
    }

    // Process in chunks of CHUNK_SIZE
    for (let i = 0; i < toSend.length; i += CHUNK_SIZE) {
      const chunk = toSend.slice(i, i + CHUNK_SIZE)
      const chunkResults = await Promise.allSettled(
        chunk.map((row) => processRow(row, ctx, partnerOrgName, partnerName, partnerOrg.invitationExpiryDays ?? 7)),
      )
      for (const settled of chunkResults) {
        if (settled.status === "fulfilled") {
          results.push(settled.value)
        } else {
          results.push({
            email: "unknown",
            clientName: "",
            status: "failed",
            reason: `unexpected: ${settled.reason}`,
          })
        }
      }
    }

    const sent = results.filter((r) => r.status === "sent").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const failed = results.filter((r) => r.status === "failed").length

    revalidatePath("/clients")
    revalidatePath("/")

    return successResponse({ sent, skipped, failed, results })
  } catch {
    return errorResponse("No se pudo procesar las invitaciones", "ERROR")
  }
}
