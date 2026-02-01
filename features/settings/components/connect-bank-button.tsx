"use client"

import { useState, useEffect } from "react"
import { PlaidLinkButton } from "@/components/banking/plaid-link-button"
import { UpgradePrompt } from "@/components/shared/upgrade-prompt"
import type { PlanType } from "@/lib/plans"

interface LimitExceededResponse {
  error: string
  code: "LIMIT_EXCEEDED"
  limit: number
  current: number
  plan: PlanType
}

interface LinkTokenResponse {
  linkToken: string
  expiration: string
}

type ApiResponse = LinkTokenResponse | LimitExceededResponse

function isLimitExceeded(response: ApiResponse): response is LimitExceededResponse {
  return "code" in response && response.code === "LIMIT_EXCEEDED"
}

export function ConnectBankButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [limitInfo, setLimitInfo] = useState<LimitExceededResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const response = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        })

        const data: ApiResponse = await response.json()

        if (response.status === 403 && isLimitExceeded(data)) {
          setLimitInfo(data)
          setLinkToken(null)
        } else if (response.ok && "linkToken" in data) {
          setLinkToken(data.linkToken)
          setLimitInfo(null)
        }
      } catch (error) {
        console.error("Error fetching link token:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLinkToken()
  }, [])

  if (isLoading) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
    )
  }

  if (limitInfo) {
    return (
      <UpgradePrompt
        limit="maxBankConnections"
        currentPlan={limitInfo.plan}
        currentCount={limitInfo.current}
        maxAllowed={limitInfo.limit}
        title="Bank connection limit reached"
        description="Upgrade your plan to connect more bank accounts."
      />
    )
  }

  return <PlaidLinkButton linkToken={linkToken} />
}
