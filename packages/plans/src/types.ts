// Billing-agnostic plan types

export type PlanType = "starter" | "business"
export type PlanInterval = "monthly" | "annual"
export type LimitKey = "maxBankConnections" | "maxUsers"

export interface PlanLimits {
  maxBankConnections: number
  maxUsers: number
}

export interface PlanPricing {
  monthly: number
  annual: number
}

export interface PlanInfo {
  name: string
  description: string
}
