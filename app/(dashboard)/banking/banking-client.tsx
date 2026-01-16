"use client"

import { useState } from "react"
import { Plus, Spinner } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { PlaidLinkButton } from "@/components/banking/plaid-link-button"

export function BankingClient() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showConnect, setShowConnect] = useState(false)

  const fetchLinkToken = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to create link token")
      }

      const data = await response.json()
      setLinkToken(data.linkToken)
      setShowConnect(true)
    } catch (error) {
      console.error("Error fetching link token:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset after successful connection
  const handleSuccess = () => {
    setLinkToken(null)
    setShowConnect(false)
  }

  if (showConnect && linkToken) {
    return (
      <PlaidLinkButton linkToken={linkToken} onSuccess={handleSuccess} />
    )
  }

  return (
    <Button onClick={fetchLinkToken} disabled={isLoading}>
      {isLoading ? (
        <>
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Connect Bank
        </>
      )}
    </Button>
  )
}
