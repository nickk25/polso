"use client"

import { useState } from "react"
import type { ToolInvocation } from "ai"
import {
  CurrencyEur,
  Tag,
  Users,
  ArrowsClockwise,
  Bell,
  Tray,
  Bank,
  ChartLine,
  MagnifyingGlass,
} from "@phosphor-icons/react"

const TOOL_ICONS: Record<string, React.ElementType> = {
  list_transactions: CurrencyEur,
  get_transaction: CurrencyEur,
  list_categories: Tag,
  list_counterparties: Users,
  get_merge_suggestions: Users,
  list_recurring_patterns: ArrowsClockwise,
  list_alerts: Bell,
  list_inbox_items: Tray,
  list_bank_accounts: Bank,
  get_cash_flow: ChartLine,
  get_cash_flow_forecast: ChartLine,
  get_revenue_forecast: ChartLine,
  get_expense_forecast: ChartLine,
  get_category_breakdown: Tag,
  get_burn_and_runway: ChartLine,
  get_top_counterparties: Users,
}

interface ToolCallBadgeProps {
  invocations: ToolInvocation[]
}

export function ToolCallBadge({ invocations }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  if (invocations.length === 0) return null

  const doneCount = invocations.filter((i) => i.state === "result").length
  const totalCount = invocations.length

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
      >
        {invocations.slice(0, 3).map((inv) => {
          const Icon = TOOL_ICONS[inv.toolName] ?? MagnifyingGlass
          return <Icon key={inv.toolCallId} className="h-3 w-3" />
        })}
        <span>
          {doneCount < totalCount
            ? `Using ${totalCount} tool${totalCount > 1 ? "s" : ""}…`
            : `Used ${totalCount} tool${totalCount > 1 ? "s" : ""}`}
        </span>
        <span className="ml-0.5 opacity-60">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1 rounded-lg border bg-muted/30 p-2.5 text-xs">
          {invocations.map((inv) => {
            const Icon = TOOL_ICONS[inv.toolName] ?? MagnifyingGlass
            return (
              <div key={inv.toolCallId} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-mono text-foreground/70">{inv.toolName}</span>
                  {Object.keys(inv.args as object).length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({JSON.stringify(inv.args).slice(0, 80)}{JSON.stringify(inv.args).length > 80 ? "…" : ""})
                    </span>
                  )}
                  {inv.state === "result" && (
                    <span className="ml-1 text-green-500 dark:text-green-400">✓</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
