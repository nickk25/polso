import { getResend, FROM_EMAIL, FROM_FOUNDER } from "./resend"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

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

export async function sendWaitlistConfirmation(email: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t("waitlistConfirmation.preview"),
    react: WaitlistConfirmationEmail({ email, locale }),
  })
}

export async function sendWelcome(to: string, name: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("welcome.preview"),
    react: WelcomeEmail({
      name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      locale,
    }),
  })
}

export async function sendWelcomeFounder(to: string, name: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_FOUNDER,
    to,
    subject: t("welcomeFounder.preview"),
    react: WelcomeFounderEmail({ name, locale }),
  })
}

export async function sendWaitlistFounder(to: string, name: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_FOUNDER,
    to,
    subject: t("waitlistFounder.preview"),
    react: WaitlistFounderEmail({ name, locale }),
  })
}

// =============================================================================
// TRIAL & SUBSCRIPTION
// =============================================================================

export async function sendTrialStarted(
  to: string,
  name: string,
  trialEndDate: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("trialStarted.subject"),
    react: TrialStartedEmail({
      name,
      trialEndDate,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      locale,
    }),
  })
}

export async function sendTrialEnding(
  to: string,
  name: string,
  daysLeft: number,
  trialEndDate: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("trialEnding.subject", { daysLeft }),
    react: TrialEndingEmail({
      name,
      daysLeft,
      trialEndDate,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      locale,
    }),
  })
}

export async function sendTrialEnded(to: string, name: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("trialEnded.subject"),
    react: TrialEndedEmail({
      name,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      locale,
    }),
  })
}

export async function sendSubscriptionConfirmed(
  to: string,
  name: string,
  planName: string,
  amount: string,
  nextBillingDate: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("subscriptionConfirmed.subject"),
    react: SubscriptionConfirmedEmail({
      name,
      planName,
      amount,
      nextBillingDate,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      locale,
    }),
  })
}

export async function sendPaymentFailed(to: string, name: string, amount: string, locale?: Locale) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("paymentFailed.subject"),
    react: PaymentFailedEmail({
      name,
      amount,
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      locale,
    }),
  })
}

export async function sendSubscriptionCancelled(
  to: string,
  name: string,
  accessEndDate: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("subscriptionCancelled.subject"),
    react: SubscriptionCancelledEmail({
      name,
      accessEndDate,
      resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      locale,
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
  accountCount: number,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("bankConnected.subject", { bankName }),
    react: BankConnectedEmail({
      name,
      bankName,
      accountCount,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      locale,
    }),
  })
}

export async function sendBankDisconnected(
  to: string,
  name: string,
  bankName: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("bankDisconnected.subject", { bankName }),
    react: BankDisconnectedEmail({
      name,
      bankName,
      reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/banking`,
      locale,
    }),
  })
}

export async function sendSyncError(
  to: string,
  name: string,
  bankName: string,
  errorMessage: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("syncError.subject", { bankName }),
    react: SyncErrorEmail({
      name,
      bankName,
      errorMessage,
      settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/banking`,
      locale,
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
  threshold: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("alertLowBalance.subject", { accountName }),
    react: LowBalanceAlertEmail({
      name,
      accountName,
      currentBalance,
      threshold,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      locale,
    }),
  })
}

export async function sendHighSpendAlert(
  to: string,
  name: string,
  category: string,
  amount: string,
  threshold: string,
  period: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("alertHighSpend.subject", { category }),
    react: HighSpendAlertEmail({
      name,
      category,
      amount,
      threshold,
      period,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses`,
      locale,
    }),
  })
}

export async function sendMissingRecurringAlert(
  to: string,
  name: string,
  vendorName: string,
  expectedAmount: string,
  expectedDate: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("alertMissingRecurring.subject", { vendorName }),
    react: MissingRecurringAlertEmail({
      name,
      vendorName,
      expectedAmount,
      expectedDate,
      recurringUrl: `${process.env.NEXT_PUBLIC_APP_URL}/recurring`,
      locale,
    }),
  })
}

export async function sendUnusualActivityAlert(
  to: string,
  name: string,
  category: string,
  amount: string,
  averageAmount: string,
  multiplier: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("alertUnusualActivity.subject", { category }),
    react: UnusualActivityAlertEmail({
      name,
      category,
      amount,
      averageAmount,
      multiplier,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses`,
      locale,
    }),
  })
}

export async function sendRunwayCriticalAlert(
  to: string,
  name: string,
  runwayMonths: string,
  threshold: string,
  currentBalance: string,
  monthlyBurn: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("alertRunwayCritical.subject", { runwayMonths }),
    react: RunwayCriticalAlertEmail({
      name,
      runwayMonths,
      threshold,
      currentBalance,
      monthlyBurn,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/analytics`,
      locale,
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
  inviteToken: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("userInvited.subject", { inviterName, organizationName }),
    react: UserInvitedEmail({
      inviterName,
      organizationName,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
      locale,
    }),
  })
}

export async function sendUserAcceptedInvite(
  to: string,
  name: string,
  newMemberName: string,
  newMemberEmail: string,
  organizationName: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("userAcceptedInvite.subject", { newMemberName, organizationName }),
    react: UserAcceptedInviteEmail({
      name,
      newMemberName,
      newMemberEmail,
      organizationName,
      teamUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/organization`,
      locale,
    }),
  })
}
