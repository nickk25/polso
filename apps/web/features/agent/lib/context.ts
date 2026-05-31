import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { getUserProfile } from "@polso/auth/get-session"
import { getLocale } from "@/lib/i18n/get-locale"

export interface ChatContext {
  organizationId: string
  orgName: string
  currency: string
  locale: string
  today: string
  firstName: string
}

export async function getChatContext(): Promise<ChatContext> {
  const [{ organizationId }, profile, locale] = await Promise.all([
    getAuthContext(),
    getUserProfile(),
    getLocale(),
  ])

  const [org, account] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    prisma.account.findFirst({
      where: { organizationId, status: "active" },
      select: { currency: true },
    }),
  ])

  const firstName = (profile.name ?? profile.email?.split("@")[0] ?? "there").split(" ")[0]
  const today = new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return {
    organizationId,
    orgName: org?.name ?? "your company",
    currency: account?.currency ?? "EUR",
    locale,
    today,
    firstName,
  }
}
