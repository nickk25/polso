"use client"

import type { ToolInvocation } from "ai"
import dynamic from "next/dynamic"
import { Skeleton } from "@polso/ui/skeleton"
import { ToolCallBadge } from "./tool-call-badge"
import { widgetSchemas } from "../widgets/registry"

const CashFlowWidget = dynamic(() => import("../widgets/cash-flow-widget").then((m) => m.CashFlowWidget), { ssr: false })
const CategoryBreakdownWidget = dynamic(() => import("../widgets/category-breakdown-widget").then((m) => m.CategoryBreakdownWidget), { ssr: false })
const BurnRunwayWidget = dynamic(() => import("../widgets/burn-runway-widget").then((m) => m.BurnRunwayWidget), { ssr: false })
const VatWidget = dynamic(() => import("../widgets/vat-widget").then((m) => m.VatWidget), { ssr: false })
const MatchSuggestionWidget = dynamic(() => import("../widgets/match-suggestion-widget").then((m) => m.MatchSuggestionWidget), { ssr: false })
const CashFlowForecastWidget = dynamic(() => import("../widgets/cash-flow-forecast-widget").then((m) => m.CashFlowForecastWidget), { ssr: false })
const TopCounterpartiesWidget = dynamic(() => import("../widgets/top-counterparties-widget").then((m) => m.TopCounterpartiesWidget), { ssr: false })
const ExpenseForecastWidget = dynamic(() => import("../widgets/expense-forecast-widget").then((m) => m.ExpenseForecastWidget), { ssr: false })
const RevenueForecastWidget = dynamic(() => import("../widgets/revenue-forecast-widget").then((m) => m.RevenueForecastWidget), { ssr: false })

const widgetComponents: Record<string, React.ComponentType<{ data: unknown }>> = {
  get_cash_flow: CashFlowWidget as React.ComponentType<{ data: unknown }>,
  get_category_breakdown: CategoryBreakdownWidget as React.ComponentType<{ data: unknown }>,
  get_burn_and_runway: BurnRunwayWidget as React.ComponentType<{ data: unknown }>,
  get_vat_summary: VatWidget as React.ComponentType<{ data: unknown }>,
  show_match_suggestion: MatchSuggestionWidget as React.ComponentType<{ data: unknown }>,
  get_cash_flow_forecast: CashFlowForecastWidget as React.ComponentType<{ data: unknown }>,
  get_top_counterparties: TopCounterpartiesWidget as React.ComponentType<{ data: unknown }>,
  get_expense_forecast: ExpenseForecastWidget as React.ComponentType<{ data: unknown }>,
  get_revenue_forecast: RevenueForecastWidget as React.ComponentType<{ data: unknown }>,
}

const WIDGET_SKELETON_HEIGHT: Record<string, number> = {
  get_cash_flow: 148,
  get_category_breakdown: 168,
  get_burn_and_runway: 116,
  get_vat_summary: 180,
  show_match_suggestion: 160,
  get_cash_flow_forecast: 240,
  get_top_counterparties: 200,
  get_expense_forecast: 240,
  get_revenue_forecast: 240,
}

interface ToolCallResultProps {
  invocation: ToolInvocation
}

export function ToolCallResult({ invocation }: ToolCallResultProps) {
  const { toolName } = invocation
  const hasWidget = toolName in widgetComponents

  if (invocation.state === "partial-call" || invocation.state === "call") {
    if (!hasWidget) return <ToolCallBadge invocations={[invocation]} />
    const height = WIDGET_SKELETON_HEIGHT[toolName] ?? 120
    return (
      <Skeleton
        className="my-2 w-full rounded-xl"
        style={{ height }}
      />
    )
  }

  if (invocation.state === "result") {
    const schema = widgetSchemas[toolName as keyof typeof widgetSchemas]
    const Component = widgetComponents[toolName]

    if (!schema || !Component) {
      return <ToolCallBadge invocations={[invocation]} />
    }

    const parsed = schema.safeParse(invocation.result)
    if (!parsed.success) {
      return <ToolCallBadge invocations={[invocation]} />
    }

    return (
      <div className="my-2 w-full">
        <Component data={parsed.data} />
      </div>
    )
  }

  return null
}
