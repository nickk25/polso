"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

export async function markAlertReadAction(
  alertId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    })

    if (!alert) {
      return errorResponse("Alert not found", "NOT_FOUND")
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    })

    revalidatePath("/alerts")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error marking alert as read:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to mark alert as read",
      "ERROR"
    )
  }
}

export async function dismissAlertAction(
  alertId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    })

    if (!alert) {
      return errorResponse("Alert not found", "NOT_FOUND")
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: { isDismissed: true, isRead: true },
    })

    revalidatePath("/alerts")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error dismissing alert:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to dismiss alert",
      "ERROR"
    )
  }
}

export async function markAllReadAction(): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.alert.updateMany({
      where: { organizationId, isRead: false, isDismissed: false },
      data: { isRead: true },
    })

    revalidatePath("/alerts")
    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error marking all alerts as read:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to mark all as read",
      "ERROR"
    )
  }
}

export async function dismissAllAction(): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.alert.updateMany({
      where: { organizationId, isDismissed: false },
      data: { isDismissed: true, isRead: true },
    })

    revalidatePath("/alerts")
    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error dismissing all alerts:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to dismiss all alerts",
      "ERROR"
    )
  }
}
