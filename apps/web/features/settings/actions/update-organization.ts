"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface UpdateOrganizationInput {
  name: string
  currency: string
  timezone: string
  fiscalYearStart: number
  dateFormat: string
}

export async function updateOrganizationAction(
  input: UpdateOrganizationInput
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: input.name,
        currency: input.currency,
        timezone: input.timezone,
        fiscalYearStart: input.fiscalYearStart,
        dateFormat: input.dateFormat,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/settings/organization")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error updating organization:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update organization",
      "ERROR"
    )
  }
}
