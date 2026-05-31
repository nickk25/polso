"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { CheckCircle } from "@phosphor-icons/react"
import { ConnectBankButton } from "@/components/banking/connect-bank-button"

interface ConnectBankStepProps {
  bankConnected: boolean
  onComplete: () => void
  onSkip: () => void
}

export function ConnectBankStep({ bankConnected, onComplete, onSkip }: ConnectBankStepProps) {
  const t = useTranslations("onboarding.steps.connectBank")
  const [connected, setConnected] = useState(bankConnected)

  if (connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" weight="fill" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">{t("connected")}</p>
            <p className="text-sm text-green-700 dark:text-green-300">{t("connectedDescription")}</p>
          </div>
        </div>
        <Button className="w-full" onClick={onComplete}>
          {t("continue")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConnectBankButton size="default" />
      <button
        type="button"
        onClick={onSkip}
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t("skip")}
      </button>
    </div>
  )
}
