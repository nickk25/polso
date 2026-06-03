import { getResend, FROM_EMAIL, FROM_FOUNDER } from "./resend"
import type { Locale } from "./locale"
import { getEmailTranslations } from "./email-translations"

import WaitlistConfirmationEmail from "../templates/waitlist-confirmation"
import WaitlistFounderEmail from "../templates/waitlist-founder"
import WelcomeEmail from "../templates/welcome"
import WelcomeFounderEmail from "../templates/welcome-founder"
import TrialStartedEmail from "../templates/trial-started"
import TrialEndingEmail from "../templates/trial-ending"
import TrialEndedEmail from "../templates/trial-ended"
import SubscriptionConfirmedEmail from "../templates/subscription-confirmed"
import PaymentFailedEmail from "../templates/payment-failed"
import SubscriptionCancelledEmail from "../templates/subscription-cancelled"
import BankConnectedEmail from "../templates/bank-connected"
import BankDisconnectedEmail from "../templates/bank-disconnected"
import SyncErrorEmail from "../templates/sync-error"
import LowBalanceAlertEmail from "../templates/alert-low-balance"
import HighSpendAlertEmail from "../templates/alert-high-spend"
import MissingRecurringAlertEmail from "../templates/alert-missing-recurring"
import UnusualActivityAlertEmail from "../templates/alert-unusual-activity"
import RunwayCriticalAlertEmail from "../templates/alert-runway-critical"
import UserInvitedEmail from "../templates/user-invited"
import UserAcceptedInviteEmail from "../templates/user-accepted-invite"
import PartnerClientInvitedEmail from "../templates/partner-client-invited"

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

export async function sendPartnerClientInvited(
  to: string,
  partnerName: string,
  partnerOrgName: string,
  clientName: string | null,
  inviteToken: string,
  locale?: Locale
) {
  const t = getEmailTranslations(locale)
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t("partnerClientInvited.subject", { partnerOrgName }),
    react: PartnerClientInvitedEmail({
      partnerName,
      partnerOrgName,
      clientName,
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
