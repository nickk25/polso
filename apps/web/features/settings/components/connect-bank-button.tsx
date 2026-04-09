"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { TinkLinkButton } from "@/components/banking/tink-link-button"
import { UpgradePrompt } from "@/components/shared/upgrade-prompt"
import type { PlanType } from "@/lib/plans"

interface LimitExceededResponse {
  error: string
  code: "LIMIT_EXCEEDED"
  limit: number
  current: number
  plan: PlanType
}

interface ConnectBankButtonProps {
  onRedirecting?: () => void
}

export function ConnectBankButton({ onRedirecting }: ConnectBankButtonProps) {
  const t = useTranslations("banking")
  const [limitInfo, setLimitInfo] = useState<LimitExceededResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check plan limits on mount so we can show upgrade prompt before the user clicks
  useEffect(() => {
    async function checkLimits() {
      try {
        const response = await fetch("/api/tink/create-link-url", { method: "POST" })
        const data = await response.json()

        if (response.status === 403 && data.code === "LIMIT_EXCEEDED") {
          setLimitInfo(data as LimitExceededResponse)
        }
      } catch {
        // Non-critical — button will still work and show error on click if limit exceeded
      } finally {
        setIsLoading(false)
      }
    }
    checkLimits()
  }, [])

  if (isLoading) {
    return <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
  }

  if (limitInfo) {
    return (
      <UpgradePrompt
        limit="maxBankConnections"
        currentPlan={limitInfo.plan}
        currentCount={limitInfo.current}
        maxAllowed={limitInfo.limit}
        title={t("connectButton.limitTitle")}
        description={t("connectButton.limitDescription")}
      />
    )
  }

  return <TinkLinkButton onRedirecting={onRedirecting} />
}
