"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function generateAgentLinkCodeAction(): Promise<
  ActionResponse<{ code: string; expiresAt: Date }>
> {
  try {
    const { organizationId } = await getAuthContext()

    // Remove all previous codes for this org (one active code at a time)
    await prisma.agentLinkCode.deleteMany({
      where: { organizationId },
    })

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Retry on the rare chance of a 6-digit collision
    let code = ""
    for (let i = 0; i < 5; i++) {
      code = generateCode()
      const existing = await prisma.agentLinkCode.findUnique({ where: { code } })
      if (!existing) break
      if (i === 4) throw new Error("Failed to generate unique code")
    }

    await prisma.agentLinkCode.create({
      data: { code, organizationId, expiresAt },
    })

    revalidatePath("/settings/agent")

    return successResponse({ code, expiresAt })
  } catch (error) {
    console.error("Error generating agent link code:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate code",
      "ERROR"
    )
  }
}
