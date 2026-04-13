import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export async function getUserPreferences() {
  const { userId } = await getAuthContext()

  // Try to find existing preferences, or return default values
  const preferences = await prisma.userPreference.findUnique({
    where: { userId },
  })

  // Return defaults if no preferences exist
  return (
    preferences ?? {
      id: null,
      userId,
      theme: "system",
      locale: "en-US",
      compactMode: false,
    }
  )
}
