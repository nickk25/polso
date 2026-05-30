"use server"

import { revalidatePath } from "next/cache"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { backfillCategoriesCore } from "@/features/transactions/lib/backfill-core"

export async function backfillCategoriesAction(): Promise<ActionResponse<{ counterpartiesSeeded: number; entriesCategorized: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await backfillCategoriesCore(organizationId)

    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    revalidatePath("/categories")

    return successResponse(result)
  } catch (error) {
    console.error("Error backfilling categories:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to backfill categories",
      "ERROR"
    )
  }
}
