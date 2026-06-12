import { cache } from "react"
import { prisma } from "@polso/db"
import { TERMS_VERSION, PRIVACY_VERSION } from "@polso/auth/consent"

export const needsConsent = cache(async (userId: string): Promise<boolean> => {
  const row = await prisma.userConsent.findUnique({
    where: { userId },
    select: { termsVersion: true, privacyVersion: true },
  })
  if (!row) return true
  return row.termsVersion !== TERMS_VERSION || row.privacyVersion !== PRIVACY_VERSION
})
