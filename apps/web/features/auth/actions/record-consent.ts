"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { prisma } from "@polso/db"
import { getAuthContext } from "@polso/auth/get-session"
import { TERMS_VERSION, PRIVACY_VERSION } from "@polso/auth/consent"

export async function recordConsentAction(): Promise<void> {
  const { userId } = await getAuthContext()
  const hdrs = await headers()

  const xff = hdrs.get("x-forwarded-for")
  // Last entry in X-Forwarded-For is the closest trusted hop; first is client-controlled
  const ipAddress = xff
    ? xff.split(",").map((s) => s.trim()).at(-1) ?? null
    : hdrs.get("x-real-ip") ?? null
  const userAgent = hdrs.get("user-agent") ?? null

  await prisma.$transaction([
    prisma.userConsent.upsert({
      where: { userId },
      create: {
        userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        ipAddress,
        userAgent,
      },
      update: {
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
      },
    }),
    prisma.consentHistory.create({
      data: {
        userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        ipAddress,
        userAgent,
      },
    }),
  ])

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
}
