"use server"

import { headers } from "next/headers"
import { prisma } from "@polso/db"
import { getAuthContext } from "@polso/auth/get-session"

const TERMS_VERSION = "2026-06-08"
const PRIVACY_VERSION = "2026-06-08"

export async function recordConsentAction(): Promise<void> {
  const { userId } = await getAuthContext()
  const hdrs = await headers()

  await prisma.userConsent.upsert({
    where: { userId },
    create: {
      userId,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null,
      userAgent: hdrs.get("user-agent") ?? null,
    },
    update: {},
  })
}
