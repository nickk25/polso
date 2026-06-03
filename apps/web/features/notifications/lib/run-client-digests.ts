import { prisma } from "@/lib/db"
import { sendClientWeeklyDigest } from "@polso/email/send"
import { format } from "date-fns"
import { buildClientDigest } from "./build-client-digest"
import { getUserEmailAndLocale } from "@/features/alerts/lib/detect-alerts"

export async function runClientWeeklyDigests(now: Date): Promise<{ digestsSent: number; digestErrors: number }> {
  const clientOrgs = await prisma.organization.findMany({
    where: { type: "client" },
    select: { id: true, name: true },
  })

  if (clientOrgs.length === 0) return { digestsSent: 0, digestErrors: 0 }

  let digestsSent = 0
  let digestErrors = 0

  const periodLabel = "esta semana"

  for (const org of clientOrgs) {
    try {
      const memberships = await prisma.userOrganization.findMany({
        where: { organizationId: org.id },
        select: { userId: true },
      })

      if (memberships.length === 0) continue

      const recipients = await prisma.notificationSetting.findMany({
        where: {
          userId: { in: memberships.map((m) => m.userId) },
          emailAlerts: true,
          emailWeeklyDigest: true,
        },
        select: { userId: true },
      })

      if (recipients.length === 0) continue

      const digest = await buildClientDigest(org.id, now)

      for (const { userId } of recipients) {
        const authUser = await getUserEmailAndLocale(userId)
        if (!authUser) continue

        await sendClientWeeklyDigest(
          authUser.email,
          authUser.name,
          org.name,
          periodLabel,
          digest.totalSpendThisWeek,
          digest.totalSpendPriorWeek,
          digest.spendDeltaPct,
          digest.topCategories,
          digest.accountBalances,
          digest.unmatchedReceiptsCount,
          digest.alertsTriggered,
          digest.largeTransactions,
          digest.currency,
          `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
          authUser.locale
        ).catch(console.error)

        digestsSent++
      }
    } catch (err) {
      console.error(`[Cron] client digest error for org ${org.id}:`, err)
      digestErrors++
    }
  }

  return { digestsSent, digestErrors }
}
