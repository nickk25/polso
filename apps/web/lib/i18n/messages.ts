import type { Locale } from "./config"

import enCommon from "@/messages/en/common.json"
import enDashboard from "@/messages/en/dashboard.json"
import enAnalytics from "@/messages/en/analytics.json"
import enSettings from "@/messages/en/settings.json"
import enBanking from "@/messages/en/banking.json"
import enBilling from "@/messages/en/billing.json"
import enMarketing from "@/messages/en/marketing.json"
import enRecurring from "@/messages/en/recurring.json"
import enCounterparties from "@/messages/en/counterparties.json"
import enExport from "@/messages/en/export.json"
import enProfile from "@/messages/en/profile.json"
import enCategories from "@/messages/en/categories.json"
import enTeam from "@/messages/en/team.json"
import enInvite from "@/messages/en/invite.json"
import enAlerts from "@/messages/en/alerts.json"
import enLegal from "@/messages/en/legal.json"
import enTransactions from "@/messages/en/transactions.json"
import enVault from "@/messages/en/vault.json"
import enAgent from "@/messages/en/agent.json"

import esCommon from "@/messages/es/common.json"
import esDashboard from "@/messages/es/dashboard.json"
import esAnalytics from "@/messages/es/analytics.json"
import esSettings from "@/messages/es/settings.json"
import esBanking from "@/messages/es/banking.json"
import esBilling from "@/messages/es/billing.json"
import esMarketing from "@/messages/es/marketing.json"
import esRecurring from "@/messages/es/recurring.json"
import esCounterparties from "@/messages/es/counterparties.json"
import esExport from "@/messages/es/export.json"
import esProfile from "@/messages/es/profile.json"
import esCategories from "@/messages/es/categories.json"
import esTeam from "@/messages/es/team.json"
import esInvite from "@/messages/es/invite.json"
import esAlerts from "@/messages/es/alerts.json"
import esLegal from "@/messages/es/legal.json"
import esTransactions from "@/messages/es/transactions.json"
import esVault from "@/messages/es/vault.json"
import esAgent from "@/messages/es/agent.json"

const messages = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    analytics: enAnalytics,
    settings: enSettings,
    banking: enBanking,
    billing: enBilling,
    marketing: enMarketing,
    recurring: enRecurring,
    counterparties: enCounterparties,
    export: enExport,
    profile: enProfile,
    categories: enCategories,
    team: enTeam,
    invite: enInvite,
    alerts: enAlerts,
    legal: enLegal,
    transactions: enTransactions,
    vault: enVault,
    agent: enAgent,
  },
  es: {
    common: esCommon,
    dashboard: esDashboard,
    analytics: esAnalytics,
    settings: esSettings,
    banking: esBanking,
    billing: esBilling,
    marketing: esMarketing,
    recurring: esRecurring,
    counterparties: esCounterparties,
    export: esExport,
    profile: esProfile,
    categories: esCategories,
    team: esTeam,
    invite: esInvite,
    alerts: esAlerts,
    legal: esLegal,
    transactions: esTransactions,
    vault: esVault,
    agent: esAgent,
  },
} as const

export function getMessages(locale: Locale) {
  return messages[locale]
}
