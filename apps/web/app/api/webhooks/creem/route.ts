import { NextRequest, NextResponse } from "next/server"
import { getProductInfo } from "@/lib/creem"
import {
  updateOrganizationPlan,
  handleSubscriptionCanceled,
  handleSubscriptionExpired,
  findOrganizationByCreemSubscription,
} from "@/features/billing/actions/sync-subscription"
import { prisma } from "@/lib/db"

// Creem webhook event types
type CreemEventType =
  | "checkout.completed"
  | "subscription.active"
  | "subscription.canceled"
  | "subscription.updated"
  | "subscription.expired"
  | "subscription.trial_ending"

interface CreemWebhookEvent {
  id: string
  type: CreemEventType
  data: {
    id: string
    customer_id: string
    product_id?: string
    subscription_id?: string
    status?: string
    current_period_start?: string
    current_period_end?: string
    cancel_at_period_end?: boolean
    trial_end?: string
    metadata?: Record<string, string>
  }
  created_at: string
}

/**
 * Verify the webhook signature from Creem
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.CREEM_WEBHOOK_SECRET

  if (!secret) {
    return false
  }

  if (!signature) {
    return false
  }

  // Creem uses HMAC-SHA256 for webhook signatures
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  )

  const expectedSignature = Buffer.from(signatureBuffer).toString("hex")

  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("x-creem-signature")

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(payload, signature)
    if (!isValid) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event: CreemWebhookEvent = JSON.parse(payload)
    console.log(`Creem webhook received: ${event.type}`, { eventId: event.id })

    switch (event.type) {
      case "checkout.completed":
        await handleCheckoutCompleted(event)
        break

      case "subscription.active":
        await handleSubscriptionActive(event)
        break

      case "subscription.canceled":
        await handleSubscriptionCanceledEvent(event)
        break

      case "subscription.updated":
        await handleSubscriptionUpdated(event)
        break

      case "subscription.expired":
        await handleSubscriptionExpiredEvent(event)
        break

      case "subscription.trial_ending":
        // Could send reminder email here
        console.log("Trial ending soon for subscription:", event.data.id)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.completed - Initial subscription setup
 */
async function handleCheckoutCompleted(event: CreemWebhookEvent) {
  const { customer_id, subscription_id, product_id, metadata } = event.data

  if (!subscription_id || !product_id) {
    console.error("Missing subscription_id or product_id in checkout event")
    return
  }

  // Get organization ID from metadata (set during checkout creation)
  const organizationId = metadata?.organization_id

  if (!organizationId) {
    console.error("Missing organization_id in checkout metadata")
    return
  }

  const productInfo = getProductInfo(product_id)
  if (!productInfo) {
    console.error(`Unknown product ID: ${product_id}`)
    return
  }

  // Link customer and subscription to organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      creemCustomerId: customer_id,
      creemSubscriptionId: subscription_id,
      planType: productInfo.plan,
      planInterval: productInfo.interval,
      planStartedAt: new Date(),
    },
  })

  console.log(`Checkout completed for org ${organizationId}: ${productInfo.plan}`)
}

/**
 * Handle subscription.active - Subscription became active
 */
async function handleSubscriptionActive(event: CreemWebhookEvent) {
  const {
    id: subscriptionId,
    customer_id,
    product_id,
    current_period_start,
    current_period_end,
    trial_end,
  } = event.data

  const organizationId = await findOrganizationByCreemSubscription(subscriptionId)
  if (!organizationId) {
    console.error(`No organization found for subscription ${subscriptionId}`)
    return
  }

  const productInfo = product_id ? getProductInfo(product_id) : null
  if (!productInfo) {
    console.error(`Unknown product ID: ${product_id}`)
    return
  }

  await updateOrganizationPlan({
    organizationId,
    plan: productInfo.plan,
    interval: productInfo.interval,
    customerId: customer_id,
    subscriptionId,
    periodStart: new Date(current_period_start!),
    periodEnd: new Date(current_period_end!),
    trialEnd: trial_end ? new Date(trial_end) : null,
    cancelAtPeriodEnd: false,
  })

  console.log(`Subscription active for org ${organizationId}: ${productInfo.plan}`)
}

/**
 * Handle subscription.canceled - User canceled subscription
 */
async function handleSubscriptionCanceledEvent(event: CreemWebhookEvent) {
  const { id: subscriptionId, current_period_end } = event.data

  const organizationId = await findOrganizationByCreemSubscription(subscriptionId)
  if (!organizationId) {
    console.error(`No organization found for subscription ${subscriptionId}`)
    return
  }

  await handleSubscriptionCanceled({
    organizationId,
    periodEnd: new Date(current_period_end!),
  })

  console.log(`Subscription canceled for org ${organizationId}, expires at ${current_period_end}`)
}

/**
 * Handle subscription.updated - Plan changed or renewed
 */
async function handleSubscriptionUpdated(event: CreemWebhookEvent) {
  const {
    id: subscriptionId,
    customer_id,
    product_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    trial_end,
  } = event.data

  const organizationId = await findOrganizationByCreemSubscription(subscriptionId)
  if (!organizationId) {
    console.error(`No organization found for subscription ${subscriptionId}`)
    return
  }

  const productInfo = product_id ? getProductInfo(product_id) : null
  if (!productInfo) {
    console.error(`Unknown product ID: ${product_id}`)
    return
  }

  await updateOrganizationPlan({
    organizationId,
    plan: productInfo.plan,
    interval: productInfo.interval,
    customerId: customer_id,
    subscriptionId,
    periodStart: new Date(current_period_start!),
    periodEnd: new Date(current_period_end!),
    trialEnd: trial_end ? new Date(trial_end) : null,
    cancelAtPeriodEnd: cancel_at_period_end ?? false,
  })

  console.log(`Subscription updated for org ${organizationId}: ${productInfo.plan}`)
}

/**
 * Handle subscription.expired - Subscription ended
 */
async function handleSubscriptionExpiredEvent(event: CreemWebhookEvent) {
  const { id: subscriptionId } = event.data

  const organizationId = await findOrganizationByCreemSubscription(subscriptionId)
  if (!organizationId) {
    console.error(`No organization found for subscription ${subscriptionId}`)
    return
  }

  await handleSubscriptionExpired(organizationId)

  console.log(`Subscription expired for org ${organizationId}, downgraded to starter`)
}
