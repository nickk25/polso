"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { sendReminderInternal } from "../lib/send-reminder-internal"

export async function sendReminderAction(clientId: string): Promise<{
  success: boolean
  error?: string
}> {
  await getPartnerAuthContext()
  return sendReminderInternal(clientId)
}
