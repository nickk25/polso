"use server"

import { revalidatePath } from "next/cache"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { backfillCategoriesCore, type BackfillResult } from "@/features/expenses/lib/backfill-core"

export async function backfillCategoriesAction(): Promise<ActionResponse<BackfillResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await backfillCategoriesCore(organizationId)

    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse(result)
  } catch (error) {
    console.error("Error backfilling categories:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to backfill categories",
      "ERROR"
    )
  }
}
