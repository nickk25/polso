import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export async function getNotificationSettings() {
  const { userId } = await getAuthContext()

  // Try to find existing settings, or return default values
  const settings = await prisma.notificationSetting.findUnique({
    where: { userId },
  })

  // Return defaults if no settings exist
  return (
    settings ?? {
      id: null,
      userId,
      emailAlerts: true,
      emailWeeklyDigest: true,
      emailLowBalance: true,
      emailSyncErrors: true,
      inAppAlerts: true,
      lowBalanceThreshold: null,
      highExpenseThreshold: null,
      emailHighSpend: true,
      emailRunwayCritical: true,
      emailUnusualActivity: true,
      runwayThreshold: 3,
      unusualMultiplier: 2,
    }
  )
}
