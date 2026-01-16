import { NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { createLinkToken } from "@/features/banking/lib/plaid-client"
import { Products, CountryCode } from "plaid"

export async function POST() {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const linkTokenResponse = await createLinkToken({
      userId: user.id,
      products: [Products.Transactions],
      countryCodes: [CountryCode.Us],
    })

    return NextResponse.json({
      linkToken: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    })
  } catch (error) {
    console.error("Error creating link token:", error)
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    )
  }
}
