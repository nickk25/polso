import type { PlanType, PlanLimits, PlanPricing, PlanInfo } from "./types"

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    maxBankConnections: 1,
    maxUsers: 2,
  },
  business: {
    maxBankConnections: 3,
    maxUsers: 5,
  },
}

export const PLAN_PRICES: Record<PlanType, PlanPricing> = {
  starter: {
    monthly: 23,
    annual: 19,
  },
  business: {
    monthly: 42,
    annual: 35,
  },
}

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

export const PLAN_FEATURES: Record<PlanType, string[]> = {
  starter: [
    "Up to 1 bank connection",
    "Up to 2 team members",
    "Automatic transaction sync",
    "Expense categorization",
    "Basic analytics",
    "CSV/PDF exports",
  ],
  business: [
    "Up to 3 bank connections",
    "Up to 5 team members",
    "Automatic transaction sync",
    "Expense categorization",
    "Advanced analytics",
    "CSV/PDF exports",
    "Priority support",
    "Custom categories",
  ],
}
