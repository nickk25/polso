import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import type { PlanType, LimitKey } from "@/lib/plans"
import { getLimit, isWithinLimit, isValidPlan } from "@/lib/plans"

/**
 * Error thrown when a plan limit is exceeded
 */
export class LimitExceededError extends Error {
  public readonly limit: LimitKey
  public readonly currentPlan: PlanType
  public readonly currentCount: number
  public readonly maxAllowed: number

  constructor(
    limit: LimitKey,
    currentPlan: PlanType,
    currentCount: number,
    maxAllowed: number
  ) {
    super(
      `Plan limit exceeded: ${limit}. Current: ${currentCount}, Max: ${maxAllowed} (${currentPlan} plan)`
    )
    this.name = "LimitExceededError"
    this.limit = limit
    this.currentPlan = currentPlan
    this.currentCount = currentCount
    this.maxAllowed = maxAllowed
  }
}

/**
 * Get the organization's plan from the database
 */
async function getOrganizationPlan(): Promise<{
  plan: PlanType
  organizationId: string
}> {
  const { organizationId } = await getAuthContext()

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planType: true },
  })

  if (!organization) {
    throw new Error("Organization not found")
  }

  // Default to starter if plan is invalid
  const plan = isValidPlan(organization.planType)
    ? organization.planType
    : "starter"

  return { plan, organizationId }
}

/**
 * Require that a limit is not exceeded, throwing LimitExceededError if it is.
 * Use this in server actions before creating a new resource.
 *
 * @param limit - The limit key to check
 * @param currentCount - The current count of resources
 * @throws LimitExceededError if the limit would be exceeded
 */
export async function requireLimit(
  limit: LimitKey,
  currentCount: number
): Promise<void> {
  const { plan } = await getOrganizationPlan()
  const maxAllowed = getLimit(plan, limit)

  if (!isWithinLimit(plan, limit, currentCount)) {
    throw new LimitExceededError(limit, plan, currentCount, maxAllowed)
  }
}

/**
 * Check if a limit would be exceeded (non-throwing version).
 * Use this for UI checks to determine if a button should be disabled.
 *
 * @param limit - The limit key to check
 * @param currentCount - The current count of resources
 * @returns true if within limit, false if exceeded
 */
export async function checkLimit(
  limit: LimitKey,
  currentCount: number
): Promise<boolean> {
  const { plan } = await getOrganizationPlan()
  return isWithinLimit(plan, limit, currentCount)
}

/**
 * Get the organization's plan and limit info for a specific limit.
 * Useful for showing upgrade prompts with current usage.
 */
export async function getLimitInfo(
  limit: LimitKey,
  currentCount: number
): Promise<{
  plan: PlanType
  limit: LimitKey
  currentCount: number
  maxAllowed: number
  isWithinLimit: boolean
  remainingCapacity: number
}> {
  const { plan } = await getOrganizationPlan()
  const maxAllowed = getLimit(plan, limit)
  const withinLimit = isWithinLimit(plan, limit, currentCount)
  const remainingCapacity = Math.max(0, maxAllowed - currentCount)

  return {
    plan,
    limit,
    currentCount,
    maxAllowed,
    isWithinLimit: withinLimit,
    remainingCapacity,
  }
}
