"use client"

import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { ArrowsClockwise, Tag, Receipt, Bell } from "@phosphor-icons/react"

interface ReconciliationStepProps {
  onComplete: () => void
}

const BULLETS = [
  { icon: ArrowsClockwise, key: "sync" },
  { icon: Tag, key: "categorize" },
  { icon: Receipt, key: "receipts" },
  { icon: Bell, key: "alerts" },
] as const

export function ReconciliationStep({ onComplete }: ReconciliationStepProps) {
  const t = useTranslations("onboarding.steps.reconciliation")

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {BULLETS.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="pt-1 text-sm">{t(`bullets.${key}`)}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={onComplete}>
        {t("continue")}
      </Button>
    </div>
  )
}
