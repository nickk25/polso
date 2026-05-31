"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { CreateOrgStep } from "./steps/create-org-step"
import { ConnectBankStep } from "./steps/connect-bank-step"
import { ReconciliationStep } from "./steps/reconciliation-step"
import { ConnectChatStep } from "./steps/connect-chat-step"

const TOTAL_STEPS = 4

interface OnboardingFlowProps {
  orgName: string
  currency: string
  telegramConnected: boolean
  bankConnected: boolean
}

const STEP_KEYS = ["createOrg", "connectBank", "reconciliation", "connectChat"] as const

const LEFT_CONTENT = [
  {
    headline: "Your finances, finally organised",
    body: "Polso connects to your bank, syncs transactions, and makes sense of where your money goes.",
  },
  {
    headline: "Real data, no manual entry",
    body: "Once connected, transactions import automatically — no spreadsheets, no typing.",
  },
  {
    headline: "Smart categorisation",
    body: "Expenses and income are categorised as they come in, ready for review.",
  },
  {
    headline: "Receipts in seconds",
    body: "Send a photo in Telegram and your receipt is matched to a transaction automatically.",
  },
]

export function OnboardingFlow({
  orgName,
  currency,
  telegramConnected,
  bankConnected,
}: OnboardingFlowProps) {
  const t = useTranslations("onboarding")
  const [step, setStep] = useState(0)

  const left = LEFT_CONTENT[step]!

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="text-xl font-semibold tracking-tight">Polso</div>
        <div
          key={step}
          className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <h2 className="text-3xl font-bold leading-tight">{left.headline}</h2>
          <p className="text-primary-foreground/70">{left.body}</p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary-foreground" : "bg-primary-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile progress */}
          <div className="flex gap-2 lg:hidden">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div
            key={step}
            className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <p className="text-sm text-muted-foreground">
              {t("progress", { current: step + 1, total: TOTAL_STEPS })}
            </p>
            <h1 className="text-2xl font-bold">
              {t(`steps.${STEP_KEYS[step]}.title`)}
            </h1>
            <p className="text-muted-foreground">
              {t(`steps.${STEP_KEYS[step]}.description`)}
            </p>
          </div>

          <div
            key={`content-${step}`}
            className="animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {step === 0 && (
              <CreateOrgStep
                initialName={orgName}
                initialCurrency={currency}
                onComplete={next}
              />
            )}
            {step === 1 && (
              <ConnectBankStep
                bankConnected={bankConnected}
                onComplete={next}
                onSkip={next}
              />
            )}
            {step === 2 && (
              <ReconciliationStep onComplete={next} />
            )}
            {step === 3 && (
              <ConnectChatStep telegramConnected={telegramConnected} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
