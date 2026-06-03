"use client"

import { useTranslations } from "next-intl"
import { Lock } from "@phosphor-icons/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polso/ui/card"
import { Progress } from "@polso/ui/progress"
import type { PlanType, LimitKey } from "@/lib/plans"
import { getPlanDisplayName } from "@/lib/plans"

interface UpgradePromptProps {
  limit: LimitKey
  currentPlan: PlanType
  currentCount: number
  maxAllowed: number
  title?: string
  description?: string
}

export function UpgradePrompt({
  limit,
  currentPlan,
  currentCount,
  maxAllowed,
  title,
  description,
}: UpgradePromptProps) {
  const t = useTranslations("billing")
  const limitLabel = limit === "maxBankConnections" ? t("upgrade.bankConnections") : t("upgrade.teamMembers")
  const usagePercent = Math.min(100, (currentCount / maxAllowed) * 100)

  const defaultTitle = t("upgrade.planLimitReached", { plan: getPlanDisplayName(currentPlan) })
  const defaultDescription = t("upgrade.usedAll", { max: maxAllowed, resource: limitLabel })

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          <CardTitle className="text-base">
            {title ?? defaultTitle}
          </CardTitle>
        </div>
        <CardDescription className="text-amber-800 dark:text-amber-200">
          {description ?? defaultDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("upgrade.usageOf", { current: currentCount, max: maxAllowed, resource: limitLabel })}
            </span>
            <span className="font-medium">{Math.round(usagePercent)}%</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>

      </CardContent>
    </Card>
  )
}

interface UsageIndicatorProps {
  limit: LimitKey
  currentCount: number
  maxAllowed: number
}

export function UsageIndicator({
  limit,
  currentCount,
  maxAllowed,
}: UsageIndicatorProps) {
  const t = useTranslations("billing")
  const usagePercent = Math.min(100, (currentCount / maxAllowed) * 100)
  const limitLabel = limit === "maxBankConnections" ? t("upgrade.bankConnections") : t("upgrade.teamMembers")

  // Determine status color
  let statusColor = "text-muted-foreground"
  if (usagePercent >= 100) {
    statusColor = "text-destructive"
  } else if (usagePercent >= 80) {
    statusColor = "text-amber-600 dark:text-amber-500"
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={statusColor}>
        {t("upgrade.usageOf", { current: currentCount, max: maxAllowed, resource: limitLabel })}
      </span>
    </div>
  )
}

interface InlineUpgradeProps {
  message: string
  planType?: PlanType
}

export function InlineUpgrade({ message }: InlineUpgradeProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
