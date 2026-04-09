import type { PlanType, PlanLimits, PlanPricing, PlanInfo } from "./types"

/**
 * Plan limits - the core feature restrictions per plan
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    maxBankConnections: 3,
    maxUsers: 2,
  },
  business: {
    maxBankConnections: 8,
    maxUsers: 5,
  },
}

/**
 * Plan pricing in EUR
 */
export const PLAN_PRICES: Record<PlanType, PlanPricing> = {
  starter: {
    monthly: 23,
    annual: 19, // per month when billed annually
  },
  business: {
    monthly: 42,
    annual: 35, // per month when billed annually
  },
}

/**
 * Plan metadata for display
 */
export const PLAN_INFO: Record<PlanType, PlanInfo> = {
  starter: {
    name: "Starter",
    description: "For freelancers and solo founders",
  },
  business: {
    name: "Business",
    description: "For growing teams",
  },
}

/**
 * Feature list for plan comparison
 */
export const PLAN_FEATURES: Record<PlanType, string[]> = {
  starter: [
    "Up to 3 bank connections",
    "Up to 2 team members",
    "Automatic transaction sync",
    "Expense categorization",
    "Basic analytics",
    "CSV/PDF exports",
  ],
  business: [
    "Up to 8 bank connections",
    "Up to 5 team members",
    "Automatic transaction sync",
    "Expense categorization",
    "Advanced analytics",
    "CSV/PDF exports",
    "Priority support",
    "Custom categories",
  ],
}
