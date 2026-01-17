"use client"

import { useState, useEffect } from "react"
import { PlaidLinkButton } from "@/components/banking/plaid-link-button"

export function ConnectBankButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const response = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        })
        if (response.ok) {
          const data = await response.json()
          setLinkToken(data.linkToken)
        }
      } catch (error) {
        console.error("Error fetching link token:", error)
      }
    }
    fetchLinkToken()
  }, [])

  return <PlaidLinkButton linkToken={linkToken} />
}
