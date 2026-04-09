"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface UpdateNotificationsInput {
  emailAlerts: boolean
  emailWeeklyDigest: boolean
  emailLowBalance: boolean
  emailSyncErrors: boolean
  inAppAlerts: boolean
  lowBalanceThreshold: number | null
  highExpenseThreshold: number | null
  emailHighSpend: boolean
  emailRunwayCritical: boolean
  emailUnusualActivity: boolean
  runwayThreshold: number | null
  unusualMultiplier: number | null
}

export async function updateNotificationsAction(
  input: UpdateNotificationsInput
): Promise<ActionResponse<void>> {
  try {
    const { userId } = await getAuthContext()

    const data = {
      emailAlerts: input.emailAlerts,
      emailWeeklyDigest: input.emailWeeklyDigest,
      emailLowBalance: input.emailLowBalance,
      emailSyncErrors: input.emailSyncErrors,
      inAppAlerts: input.inAppAlerts,
      lowBalanceThreshold: input.lowBalanceThreshold,
      highExpenseThreshold: input.highExpenseThreshold,
      emailHighSpend: input.emailHighSpend,
      emailRunwayCritical: input.emailRunwayCritical,
      emailUnusualActivity: input.emailUnusualActivity,
      runwayThreshold: input.runwayThreshold,
      unusualMultiplier: input.unusualMultiplier,
    }

    await prisma.notificationSetting.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })

    revalidatePath("/settings")
    revalidatePath("/settings/notifications")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error updating notification settings:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update notification settings",
      "ERROR"
    )
  }
}
