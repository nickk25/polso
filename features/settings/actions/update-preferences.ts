"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface UpdatePreferencesInput {
  theme: string
  locale: string
  compactMode: boolean
}

export async function updatePreferencesAction(
  input: UpdatePreferencesInput
): Promise<ActionResponse<void>> {
  try {
    const { userId } = await getAuthContext()

    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        theme: input.theme,
        locale: input.locale,
        compactMode: input.compactMode,
      },
      update: {
        theme: input.theme,
        locale: input.locale,
        compactMode: input.compactMode,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/settings/preferences")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error updating preferences:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update preferences",
      "ERROR"
    )
  }
}
