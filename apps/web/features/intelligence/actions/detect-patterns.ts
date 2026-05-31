"use server"

import { revalidatePath } from "next/cache"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { detectPatternsForOrg } from "../lib/detect-patterns-core"

interface DetectionResult {
  patternsDetected: number
  patternsCreated: number
  patternsUpdated: number
  patternsPaused: number
}

export async function detectPatternsAction(): Promise<ActionResponse<DetectionResult>> {
  try {
    const { organizationId } = await getAuthContext()
    const result = await detectPatternsForOrg(organizationId)

    revalidatePath("/recurring")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return successResponse(result)
  } catch (error) {
    console.error("Error detecting patterns:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to detect patterns",
      "ERROR"
    )
  }
}
