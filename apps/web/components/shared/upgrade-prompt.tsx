"use client"

import { useTranslations } from "next-intl"
import { ArrowRight, Lock } from "@phosphor-icons/react"
import Link from "next/link"
import { Button } from "@polso/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polso/ui/card"
import { Progress } from "@polso/ui/progress"
import type { PlanType, LimitKey } from "@/lib/plans"
import { getPlanDisplayName, getUpgradePlan } from "@/lib/plans"

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
  const upgradePlan = getUpgradePlan(currentPlan)
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

        {upgradePlan && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("upgrade.upgradeFor", { plan: getPlanDisplayName(upgradePlan) })}
            </p>
            <Button asChild size="sm">
              <Link href="/settings/billing">
                {t("upgrade.upgrade")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface UsageIndicatorProps {
  limit: LimitKey
  currentCount: number
  maxAllowed: number
  showUpgradeAt?: number // Show upgrade prompt when this percentage is reached (default: 100)
}

export function UsageIndicator({
  limit,
  currentCount,
  maxAllowed,
  showUpgradeAt = 100,
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
      {usagePercent >= showUpgradeAt && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5" asChild>
          <Link href="/settings/billing">
            <ArrowRight className="h-3 w-3" />
            {t("upgrade.upgrade")}
          </Link>
        </Button>
      )}
    </div>
  )
}

interface InlineUpgradeProps {
  message: string
  planType?: PlanType
}

export function InlineUpgrade({ message, planType }: InlineUpgradeProps) {
  const t = useTranslations("billing")
  const upgradePlan = planType ? getUpgradePlan(planType) : "business"

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {upgradePlan && (
        <Button asChild size="sm" variant="outline">
          <Link href="/settings/billing">
            {t("upgrade.upgradeTo", { plan: getPlanDisplayName(upgradePlan) })}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
