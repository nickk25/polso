import { NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { getGoCardlessClient } from "@/features/banking/lib/gocardless-client"

/**
 * GET /api/gocardless/institutions?country=ES
 * Returns the list of available institutions for the bank picker dialog.
 */
export async function GET(request: Request) {
  try {
    const { user } = await neonAuth()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country") ?? "ES"

    const gc = getGoCardlessClient()
    const institutions = await gc.getInstitutions(country)

    return NextResponse.json({ institutions })
  } catch (error) {
    console.error("[GoCardless] Error fetching institutions:", error)
    return NextResponse.json(
      { error: "Failed to fetch institutions" },
      { status: 500 }
    )
  }
}
