import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import type { PlanType, PlanInterval } from "@/lib/plans"
import { isValidPlan } from "@/lib/plans"

export interface SubscriptionInfo {
  plan: PlanType
  interval: PlanInterval | null
  startedAt: Date | null
  expiresAt: Date | null
  trialEndsAt: Date | null
  isTrialing: boolean
  isCanceled: boolean
  isExpired: boolean
  // Creem fields
  customerId: string | null
  subscriptionId: string | null
  // Scheduled changes
  scheduledPlanType: PlanType | null
  scheduledPlanInterval: PlanInterval | null
  scheduledChangeAt: Date | null
  hasScheduledDowngrade: boolean
}

/**
 * Get the current organization's subscription info
 */
export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const { organizationId } = await getAuthContext()

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planType: true,
      planInterval: true,
      planStartedAt: true,
      planExpiresAt: true,
      trialEndsAt: true,
      creemCustomerId: true,
      creemSubscriptionId: true,
      scheduledPlanType: true,
      scheduledPlanInterval: true,
      scheduledChangeAt: true,
    },
  })

  if (!organization) {
    return null
  }

  const now = new Date()

  // Determine if trialing
  const isTrialing = organization.trialEndsAt
    ? organization.trialEndsAt > now
    : false

  // Determine if canceled (has expiry date but no scheduled renewal)
  const isCanceled = organization.planExpiresAt !== null

  // Determine if expired
  const isExpired = organization.planExpiresAt
    ? organization.planExpiresAt < now
    : false

  // Validate plan type
  const plan = isValidPlan(organization.planType)
    ? organization.planType
    : "starter"

  // Validate interval
  const interval =
    organization.planInterval === "monthly" ||
    organization.planInterval === "annual"
      ? organization.planInterval
      : null

  // Validate scheduled plan type
  const scheduledPlanType =
    organization.scheduledPlanType &&
    isValidPlan(organization.scheduledPlanType)
      ? organization.scheduledPlanType
      : null

  // Validate scheduled interval
  const scheduledPlanInterval =
    organization.scheduledPlanInterval === "monthly" ||
    organization.scheduledPlanInterval === "annual"
      ? organization.scheduledPlanInterval
      : null

  // Check if there's a scheduled downgrade
  const hasScheduledDowngrade =
    scheduledPlanType !== null && scheduledPlanType !== plan

  return {
    plan,
    interval,
    startedAt: organization.planStartedAt,
    expiresAt: organization.planExpiresAt,
    trialEndsAt: organization.trialEndsAt,
    isTrialing,
    isCanceled,
    isExpired,
    customerId: organization.creemCustomerId,
    subscriptionId: organization.creemSubscriptionId,
    scheduledPlanType,
    scheduledPlanInterval,
    scheduledChangeAt: organization.scheduledChangeAt,
    hasScheduledDowngrade,
  }
}

/**
 * Get subscription info by organization ID (for internal use)
 */
export async function getSubscriptionByOrganizationId(
  organizationId: string
): Promise<SubscriptionInfo | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planType: true,
      planInterval: true,
      planStartedAt: true,
      planExpiresAt: true,
      trialEndsAt: true,
      creemCustomerId: true,
      creemSubscriptionId: true,
      scheduledPlanType: true,
      scheduledPlanInterval: true,
      scheduledChangeAt: true,
    },
  })

  if (!organization) {
    return null
  }

  const now = new Date()

  const isTrialing = organization.trialEndsAt
    ? organization.trialEndsAt > now
    : false

  const isCanceled = organization.planExpiresAt !== null

  const isExpired = organization.planExpiresAt
    ? organization.planExpiresAt < now
    : false

  const plan = isValidPlan(organization.planType)
    ? organization.planType
    : "starter"

  const interval =
    organization.planInterval === "monthly" ||
    organization.planInterval === "annual"
      ? organization.planInterval
      : null

  const scheduledPlanType =
    organization.scheduledPlanType &&
    isValidPlan(organization.scheduledPlanType)
      ? organization.scheduledPlanType
      : null

  const scheduledPlanInterval =
    organization.scheduledPlanInterval === "monthly" ||
    organization.scheduledPlanInterval === "annual"
      ? organization.scheduledPlanInterval
      : null

  const hasScheduledDowngrade =
    scheduledPlanType !== null && scheduledPlanType !== plan

  return {
    plan,
    interval,
    startedAt: organization.planStartedAt,
    expiresAt: organization.planExpiresAt,
    trialEndsAt: organization.trialEndsAt,
    isTrialing,
    isCanceled,
    isExpired,
    customerId: organization.creemCustomerId,
    subscriptionId: organization.creemSubscriptionId,
    scheduledPlanType,
    scheduledPlanInterval,
    scheduledChangeAt: organization.scheduledChangeAt,
    hasScheduledDowngrade,
  }
}
