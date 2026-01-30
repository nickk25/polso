import { resend, FROM_EMAIL, FROM_FOUNDER } from "./resend"

// Onboarding emails
import WaitlistConfirmationEmail from "@/emails/waitlist-confirmation"
import WaitlistFounderEmail from "@/emails/waitlist-founder"
import WelcomeEmail from "@/emails/welcome"
import WelcomeFounderEmail from "@/emails/welcome-founder"

// Trial & Subscription emails
import TrialStartedEmail from "@/emails/trial-started"
import TrialEndingEmail from "@/emails/trial-ending"
import TrialEndedEmail from "@/emails/trial-ended"
import SubscriptionConfirmedEmail from "@/emails/subscription-confirmed"
import PaymentFailedEmail from "@/emails/payment-failed"
import SubscriptionCancelledEmail from "@/emails/subscription-cancelled"

// Bank sync emails
import BankConnectedEmail from "@/emails/bank-connected"
import BankDisconnectedEmail from "@/emails/bank-disconnected"
import SyncErrorEmail from "@/emails/sync-error"

// Alert emails
import LowBalanceAlertEmail from "@/emails/alert-low-balance"
import HighSpendAlertEmail from "@/emails/alert-high-spend"
import MissingRecurringAlertEmail from "@/emails/alert-missing-recurring"
import UnusualActivityAlertEmail from "@/emails/alert-unusual-activity"
import RunwayCriticalAlertEmail from "@/emails/alert-runway-critical"

// Team emails
import UserInvitedEmail from "@/emails/user-invited"
import UserAcceptedInviteEmail from "@/emails/user-accepted-invite"

// =============================================================================
// ONBOARDING
// =============================================================================

export async function sendWaitlistConfirmation(email: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're on the Polso waitlist!",
    react: WaitlistConfirmationEmail({ email }),
  })
}

export async function sendWelcome(to: string, name: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Polso!",
    react: WelcomeEmail({
      name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })
}

export async function sendWelcomeFounder(to: string, name: string) {
  return resend.emails.send({
    from: FROM_FOUNDER,
    to,
    subject: "Welcome to Polso",
    react: WelcomeFounderEmail({ name }),
  })
}

export async function sendWaitlistFounder(to: string, name: string) {
  return resend.emails.send({
    from: FROM_FOUNDER,
    to,
    subject: "You're on the list",
    react: WaitlistFounderEmail({ name }),
  })
}

// =============================================================================
// TRIAL & SUBSCRIPTION
// =============================================================================

export async function sendTrialStarted(
  to: string,
  name: string,
  trialEndDate: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your 14-day free trial has started",
    react: TrialStartedEmail({
      name,
      trialEndDate,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })
}

export async function sendTrialEnding(
  to: string,
  name: string,
  daysLeft: number,
  trialEndDate: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your trial ends in ${daysLeft} days`,
    react: TrialEndingEmail({
      name,
      daysLeft,
      trialEndDate,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    }),
  })
}

export async function sendTrialEnded(to: string, name: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your Polso trial has ended",
    react: TrialEndedEmail({
      name,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    }),
  })
}

export async function sendSubscriptionConfirmed(
  to: string,
  name: string,
  planName: string,
  amount: string,
  nextBillingDate: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your Polso subscription is active",
    react: SubscriptionConfirmedEmail({
      name,
      planName,
      amount,
      nextBillingDate,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })
}

export async function sendPaymentFailed(to: string, name: string, amount: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Action required: Payment failed",
    react: PaymentFailedEmail({
      name,
      amount,
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    }),
  })
}

export async function sendSubscriptionCancelled(
  to: string,
  name: string,
  accessEndDate: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your Polso subscription has been cancelled",
    react: SubscriptionCancelledEmail({
      name,
      accessEndDate,
      resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    }),
  })
}

// =============================================================================
// BANK SYNC
// =============================================================================

export async function sendBankConnected(
  to: string,
  name: string,
  bankName: string,
  accountCount: number
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${bankName} connected successfully`,
    react: BankConnectedEmail({
      name,
      bankName,
      accountCount,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })
}

export async function sendBankDisconnected(
  to: string,
  name: string,
  bankName: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Action required: ${bankName} disconnected`,
    react: BankDisconnectedEmail({
      name,
      bankName,
      reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/banking`,
    }),
  })
}

export async function sendSyncError(
  to: string,
  name: string,
  bankName: string,
  errorMessage: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Sync error with ${bankName}`,
    react: SyncErrorEmail({
      name,
      bankName,
      errorMessage,
      settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/banking`,
    }),
  })
}

// =============================================================================
// ALERTS
// =============================================================================

export async function sendLowBalanceAlert(
  to: string,
  name: string,
  accountName: string,
  currentBalance: string,
  threshold: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Low balance alert: ${accountName}`,
    react: LowBalanceAlertEmail({
      name,
      accountName,
      currentBalance,
      threshold,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })
}

export async function sendHighSpendAlert(
  to: string,
  name: string,
  category: string,
  amount: string,
  threshold: string,
  period: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `High spend alert: ${category}`,
    react: HighSpendAlertEmail({
      name,
      category,
      amount,
      threshold,
      period,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses`,
    }),
  })
}

export async function sendMissingRecurringAlert(
  to: string,
  name: string,
  vendorName: string,
  expectedAmount: string,
  expectedDate: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Missing payment: ${vendorName}`,
    react: MissingRecurringAlertEmail({
      name,
      vendorName,
      expectedAmount,
      expectedDate,
      recurringUrl: `${process.env.NEXT_PUBLIC_APP_URL}/recurring`,
    }),
  })
}

export async function sendUnusualActivityAlert(
  to: string,
  name: string,
  category: string,
  amount: string,
  averageAmount: string,
  multiplier: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Unusual activity: ${category}`,
    react: UnusualActivityAlertEmail({
      name,
      category,
      amount,
      averageAmount,
      multiplier,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses`,
    }),
  })
}

export async function sendRunwayCriticalAlert(
  to: string,
  name: string,
  runwayMonths: string,
  threshold: string,
  currentBalance: string,
  monthlyBurn: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Runway alert: ${runwayMonths} months remaining`,
    react: RunwayCriticalAlertEmail({
      name,
      runwayMonths,
      threshold,
      currentBalance,
      monthlyBurn,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/analytics`,
    }),
  })
}

// =============================================================================
// TEAM
// =============================================================================

export async function sendUserInvited(
  to: string,
  inviterName: string,
  organizationName: string,
  inviteToken: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} invited you to ${organizationName}`,
    react: UserInvitedEmail({
      inviterName,
      organizationName,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
    }),
  })
}

export async function sendUserAcceptedInvite(
  to: string,
  name: string,
  newMemberName: string,
  newMemberEmail: string,
  organizationName: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${newMemberName} joined ${organizationName}`,
    react: UserAcceptedInviteEmail({
      name,
      newMemberName,
      newMemberEmail,
      organizationName,
      teamUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/organization`,
    }),
  })
}
