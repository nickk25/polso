"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { localeMap } from "@/lib/i18n/config"

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

    // Sync locale to cookie for next-intl
    const baseLocale = localeMap[input.locale] ?? "en"
    const cookieStore = await cookies()
    cookieStore.set("NEXT_LOCALE", baseLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
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
