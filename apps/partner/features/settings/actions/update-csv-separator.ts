"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const VALID_SEPARATORS = [";", ",", "\t"]

export async function updateCsvSeparatorAction(separator: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!VALID_SEPARATORS.includes(separator)) {
    return { success: false, error: "Separador no válido" }
  }

  const ctx = await getPartnerAuthContext()

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { csvSeparator: separator },
  })

  revalidatePath("/settings")
  return { success: true }
}
