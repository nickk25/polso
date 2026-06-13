"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { GitMerge, Sparkle, CaretDown, CaretUp, X } from "@phosphor-icons/react"
import type { MergeSuggestionGroup } from "../lib/merge-suggestions"

interface CounterpartyMergeSuggestionsProps {
  suggestions: MergeSuggestionGroup[]
  onMergeGroup: (ids: string[]) => void
  onDismiss: (group: MergeSuggestionGroup) => void
}

type ConfidenceTier = "high" | "medium" | "low"

function tierOf(confidence: number): ConfidenceTier {
  if (confidence >= 0.66) return "high"
  if (confidence >= 0.5) return "medium"
  return "low"
}

// Badge variant per tier — only `variant` is passed (no shape/spacing overrides).
const TIER_VARIANT: Record<ConfidenceTier, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
}

export function CounterpartyMergeSuggestions({
  suggestions,
  onMergeGroup,
  onDismiss,
}: CounterpartyMergeSuggestionsProps) {
  const t = useTranslations("counterparties")
  const [expanded, setExpanded] = useState(false)

  if (suggestions.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkle weight="fill" className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {t("suggestions.title", { count: suggestions.length })}
          </span>
          <span className="text-xs text-amber-700 dark:text-amber-400">
            — {t("suggestions.subtitle")}
          </span>
        </div>
        {expanded
          ? <CaretUp className="h-4 w-4 text-amber-500 shrink-0" />
          : <CaretDown className="h-4 w-4 text-amber-500 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-amber-200 dark:border-amber-900 divide-y divide-amber-200 dark:divide-amber-900">
          {suggestions.map((group) => {
            const tier = tierOf(group.confidence)
            const isLow = tier === "low"
            return (
              <div
                key={group.counterparties.map((c) => c.id).join("+")}
                className={`flex items-center gap-4 p-4 ${isLow ? "opacity-70" : ""}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge variant={TIER_VARIANT[tier]}>{t(`suggestions.confidence.${tier}`)}</Badge>
                    {group.counterparties.map((cp) => (
                      <span key={cp.id} className="text-sm">
                        <span className="font-medium">{cp.name}</span>
                        <span className="text-muted-foreground text-xs ml-1">({cp._count.entries})</span>
                      </span>
                    ))}
                  </div>
                  {group.sharedTokens.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("suggestions.sharedHint", { tokens: group.sharedTokens.join(", ") })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onDismiss(group)}>
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    {t("suggestions.dismiss")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMergeGroup(group.counterparties.map((cp) => cp.id))}
                  >
                    <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                    {t("suggestions.merge")}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
