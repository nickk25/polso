"use server"

import { prisma } from "@/lib/db"
import { getCreemSubscription, getProductInfo } from "@/lib/creem"
import type { PlanType, PlanInterval } from "@/lib/plans"

interface SyncResult {
  success: boolean
  plan?: PlanType
  interval?: PlanInterval
  error?: string
}

/**
 * Sync subscription status from Creem for an organization
 */
export async function syncSubscription(
  organizationId: string
): Promise<SyncResult> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        creemSubscriptionId: true,
        planType: true,
      },
    })

    if (!organization?.creemSubscriptionId) {
      return { success: true, plan: "starter" }
    }

    const subscription = await getCreemSubscription(
      organization.creemSubscriptionId
    )

    // Get plan info from product ID
    const productInfo = getProductInfo(subscription.product_id)

    if (!productInfo) {
      console.error(
        `Unknown product ID: ${subscription.product_id} for org ${organizationId}`
      )
      return { success: false, error: "Unknown product ID" }
    }

    // Determine plan status
    const isActive =
      subscription.status === "active" || subscription.status === "trialing"
    const isCanceled = subscription.cancel_at_period_end
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end)
      : null

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planType: isActive ? productInfo.plan : "starter",
        planInterval: productInfo.interval,
        planStartedAt: new Date(subscription.current_period_start),
        planExpiresAt: isCanceled
          ? new Date(subscription.current_period_end)
          : null,
        trialEndsAt: trialEnd,
      },
    })

    return {
      success: true,
      plan: productInfo.plan,
      interval: productInfo.interval,
    }
  } catch (error) {
    console.error(`Failed to sync subscription for org ${organizationId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Update organization plan from webhook event
 */
export async function updateOrganizationPlan(params: {
  organizationId: string
  plan: PlanType
  interval: PlanInterval
  customerId: string
  subscriptionId: string
  periodStart: Date
  periodEnd: Date
  trialEnd?: Date | null
  cancelAtPeriodEnd?: boolean
}): Promise<void> {
  const {
    organizationId,
    plan,
    interval,
    customerId,
    subscriptionId,
    periodStart,
    periodEnd,
    trialEnd,
    cancelAtPeriodEnd,
  } = params

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planType: plan,
      planInterval: interval,
      planStartedAt: periodStart,
      planExpiresAt: cancelAtPeriodEnd ? periodEnd : null,
      trialEndsAt: trialEnd,
      creemCustomerId: customerId,
      creemSubscriptionId: subscriptionId,
      // Clear any scheduled changes when subscription updates
      scheduledPlanType: null,
      scheduledPlanInterval: null,
      scheduledChangeAt: null,
    },
  })
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCanceled(params: {
  organizationId: string
  periodEnd: Date
}): Promise<void> {
  const { organizationId, periodEnd } = params

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planExpiresAt: periodEnd,
    },
  })
}

/**
 * Handle subscription expiry (downgrade to starter)
 */
export async function handleSubscriptionExpired(
  organizationId: string
): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planType: "starter",
      planInterval: null,
      planStartedAt: null,
      planExpiresAt: null,
      trialEndsAt: null,
      creemSubscriptionId: null,
      scheduledPlanType: null,
      scheduledPlanInterval: null,
      scheduledChangeAt: null,
    },
  })
}

/**
 * Find organization by Creem customer ID
 */
export async function findOrganizationByCreemCustomer(
  customerId: string
): Promise<string | null> {
  const organization = await prisma.organization.findFirst({
    where: { creemCustomerId: customerId },
    select: { id: true },
  })

  return organization?.id ?? null
}

/**
 * Find organization by Creem subscription ID
 */
export async function findOrganizationByCreemSubscription(
  subscriptionId: string
): Promise<string | null> {
  const organization = await prisma.organization.findFirst({
    where: { creemSubscriptionId: subscriptionId },
    select: { id: true },
  })

  return organization?.id ?? null
}
