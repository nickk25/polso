import type { PlanType, PlanInterval } from "@polso/plans"

// Creem API configuration
export function isCreemTestMode(): boolean {
  return process.env.CREEM_TEST_MODE === "true"
}

export function getCreemApiBase(): string {
  return isCreemTestMode()
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1"
}

/**
 * Creem product IDs mapped by plan and interval
 */
export const CREEM_PRODUCTS = {
  starter: {
    monthly: process.env.CREEM_STARTER_MONTHLY_PRODUCT_ID ?? "",
    annual: process.env.CREEM_STARTER_ANNUAL_PRODUCT_ID ?? "",
  },
  business: {
    monthly: process.env.CREEM_BUSINESS_MONTHLY_PRODUCT_ID ?? "",
    annual: process.env.CREEM_BUSINESS_ANNUAL_PRODUCT_ID ?? "",
  },
} as const

/**
 * Reverse lookup: get plan info from product ID
 */
export function getProductInfo(
  productId: string
): { plan: PlanType; interval: PlanInterval } | null {
  for (const [plan, intervals] of Object.entries(CREEM_PRODUCTS)) {
    for (const [interval, id] of Object.entries(intervals)) {
      if (id === productId) {
        return {
          plan: plan as PlanType,
          interval: interval as PlanInterval,
        }
      }
    }
  }
  return null
}

/**
 * Get the product ID for a plan and interval
 */
export function getProductId(plan: PlanType, interval: PlanInterval): string {
  return CREEM_PRODUCTS[plan][interval]
}

// Creem API types
export interface CreemCustomer {
  id: string
  email: string
  name?: string
  metadata?: Record<string, string>
}

export interface CreemSubscription {
  id: string
  customer_id: string
  product_id: string
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing"
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  trial_end?: string
  metadata?: Record<string, string>
}

export interface CreemCheckoutSession {
  id: string
  url: string
  customer_id?: string
  subscription_id?: string
  status: "open" | "complete" | "expired"
}

/**
 * Make an authenticated request to the Creem API
 */
export async function creemFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.CREEM_API_KEY
  if (!apiKey) {
    throw new Error("CREEM_API_KEY is not configured")
  }

  const url = `${getCreemApiBase()}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Creem API error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Get a subscription by ID
 */
export async function getCreemSubscription(
  subscriptionId: string
): Promise<CreemSubscription> {
  return creemFetch<CreemSubscription>(`/subscriptions/${subscriptionId}`)
}

/**
 * Get customer portal URL
 */
export async function getCreemPortalUrl(
  customerId: string
): Promise<string | null> {
  try {
    const response = await creemFetch<{ url: string }>(
      `/customers/${customerId}/portal`
    )
    return response.url
  } catch {
    return null
  }
}

/**
 * Create a checkout session
 */
export async function createCreemCheckout(params: {
  productId: string
  customerId?: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}): Promise<CreemCheckoutSession> {
  return creemFetch<CreemCheckoutSession>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_id: params.productId,
      customer_id: params.customerId,
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    }),
  })
}

/**
 * Cancel a subscription at period end
 */
export async function cancelCreemSubscription(
  subscriptionId: string
): Promise<CreemSubscription> {
  return creemFetch<CreemSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      cancel_at_period_end: true,
    }),
  })
}
