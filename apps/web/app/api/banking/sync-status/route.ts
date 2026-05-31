import { NextResponse } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { organizationId } = await getAuthContext()

    const pendingCount = await prisma.account.count({
      where: { organizationId, lastSyncedAt: null, status: "active" },
    })

    const hasError = pendingCount === 0 && await prisma.account.count({
      where: { organizationId, syncError: { not: null }, status: "active" },
    }) > 0

    return NextResponse.json({ syncing: pendingCount > 0, hasError })
  } catch {
    return NextResponse.json({ syncing: false, hasError: false })
  }
}
