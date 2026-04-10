import type { PlanType, LimitKey } from "./types"
import { PLAN_LIMITS, PLAN_INFO } from "./features"

export function getLimit(plan: PlanType, limit: LimitKey): number {
  return PLAN_LIMITS[plan][limit]
}

export function isWithinLimit(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): boolean {
  const maxAllowed = getLimit(plan, limit)
  return currentCount < maxAllowed
}

export function hasCapacity(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): boolean {
  return isWithinLimit(plan, limit, currentCount)
}

export function getRemainingCapacity(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): number {
  const maxAllowed = getLimit(plan, limit)
  return Math.max(0, maxAllowed - currentCount)
}

export function getPlanDisplayName(plan: PlanType): string {
  return PLAN_INFO[plan].name
}

export function getAllPlans(): PlanType[] {
  return ["starter", "business"]
}

export function isValidPlan(plan: string): plan is PlanType {
  return plan === "starter" || plan === "business"
}

export function getUpgradePlan(currentPlan: PlanType): PlanType | null {
  if (currentPlan === "starter") {
    return "business"
  }
  return null
}
