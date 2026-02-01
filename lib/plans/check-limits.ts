import type { PlanType, LimitKey } from "./types"
import { PLAN_LIMITS, PLAN_INFO } from "./features"

/**
 * Get the limit value for a specific plan and limit key
 */
export function getLimit(plan: PlanType, limit: LimitKey): number {
  return PLAN_LIMITS[plan][limit]
}

/**
 * Check if the current count is within the plan limit
 */
export function isWithinLimit(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): boolean {
  const maxAllowed = getLimit(plan, limit)
  return currentCount < maxAllowed
}

/**
 * Check if there's capacity to add one more item
 * (alias for isWithinLimit for semantic clarity)
 */
export function hasCapacity(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): boolean {
  return isWithinLimit(plan, limit, currentCount)
}

/**
 * Get remaining capacity for a limit
 */
export function getRemainingCapacity(
  plan: PlanType,
  limit: LimitKey,
  currentCount: number
): number {
  const maxAllowed = getLimit(plan, limit)
  return Math.max(0, maxAllowed - currentCount)
}

/**
 * Get the display name for a plan
 */
export function getPlanDisplayName(plan: PlanType): string {
  return PLAN_INFO[plan].name
}

/**
 * Get all plan types in order
 */
export function getAllPlans(): PlanType[] {
  return ["starter", "business"]
}

/**
 * Check if a plan type is valid
 */
export function isValidPlan(plan: string): plan is PlanType {
  return plan === "starter" || plan === "business"
}

/**
 * Get the next upgrade plan (if any)
 */
export function getUpgradePlan(currentPlan: PlanType): PlanType | null {
  if (currentPlan === "starter") {
    return "business"
  }
  return null
}
