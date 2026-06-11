import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getTransactions } from "@/features/transactions/queries/get-transactions"
import { getAllCategories, getActiveCategories } from "@/features/categories/queries/get-categories"
import { getCounterparties } from "@/features/counterparties/queries/get-counterparties"
import { computeMergeSuggestions } from "@/features/counterparties/lib/merge-suggestions"
import { getAllPatternsGrouped } from "@/features/intelligence/queries/get-recurring-patterns"
import { getAlerts } from "@/features/alerts/queries/get-alerts"
import { getVaultItems } from "@/features/inbox/queries/get-vault"
import { getAccountsWithBalance } from "@/features/banking/queries/get-accounts"
import { getCashFlow, getBurnRateAndRunway, getCategoryBreakdown, getTopCounterparties, getVATSummary } from "@/features/analytics/queries/get-analytics"
import { getCashFlowForecast, getRevenueForecast, getExpenseForecast } from "@/features/analytics/queries/get-forecasts"
import { truncate } from "../lib/tool-output"

export function buildTools(organizationId?: string, _userId?: string) {
  // When orgId is provided (Telegram/non-web paths), inject it explicitly.
  // When omitted (web chat path), each query falls back to getAuthContext().
  const orgId = organizationId

  const listTransactions = tool({
    description: "List transactions filtered by direction, date range, category, counterparty, or search term. Returns up to 50 rows.",
    parameters: z.object({
      direction: z.enum(["expense", "income", "all"]).optional().describe("Filter by expense or income"),
      from: z.string().optional().describe("Start date ISO string e.g. 2026-01-01"),
      to: z.string().optional().describe("End date ISO string e.g. 2026-01-31"),
      categoryId: z.string().optional().describe("Filter by category ID"),
      counterpartyId: z.string().optional().describe("Filter by counterparty ID"),
      search: z.string().optional().describe("Search in description or counterparty name"),
      limit: z.number().min(1).max(50).default(20).optional(),
    }),
    execute: async ({ direction, from, to, categoryId, search, limit }) => {
      const result = await getTransactions(
        {
          direction: direction === "all" ? undefined : direction,
          dateFrom: from ? new Date(from) : undefined,
          dateTo: to ? new Date(to) : undefined,
          categoryId,
          search,
        },
        1,
        limit ?? 20,
        orgId
      )
      return {
        transactions: truncate(
          result.transactions.map((t) => ({
            id: t.id,
            date: t.date,
            direction: t.direction,
            amount: t.amount,
            currency: t.currency,
            description: t.description,
            category: t.category ? { id: t.category.id, name: t.category.name } : null,
            counterparty: t.counterparty ? { id: t.counterparty.id, name: t.counterparty.name } : null,
            status: t.status,
          }))
        ),
        total: result.total,
      }
    },
  })

  const getTransaction = tool({
    description: "Get full details of a single transaction by its ID, including any attached documents.",
    parameters: z.object({
      id: z.string().describe("The transaction entry ID"),
    }),
    execute: async ({ id }) => {
      const resolvedOrgId = orgId ?? (await import("@polso/auth/get-session").then(m => m.getAuthContext())).organizationId
      const entry = await prisma.entry.findFirst({
        where: { id, organizationId: resolvedOrgId },
        select: {
          id: true,
          date: true,
          direction: true,
          amount: true,
          currency: true,
          description: true,
          status: true,
          entryType: true,
          notes: true,
          category: { select: { id: true, name: true, color: true } },
          counterparty: { select: { id: true, name: true, website: true } },
        },
      })
      if (!entry) return { error: "Transaction not found" }
      return entry
    },
  })

  const listCategories = tool({
    description: "List transaction categories with their entry counts. Use activeOnly=true to hide empty categories.",
    parameters: z.object({
      activeOnly: z.boolean().default(false).optional().describe("Only return categories that have entries"),
    }),
    execute: async ({ activeOnly }) => {
      const categories = activeOnly ? await getActiveCategories(orgId) : await getAllCategories(orgId)
      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        entryType: c.entryType,
        entryCount: c._count.entries,
      }))
    },
  })

  const listCounterparties = tool({
    description: "List counterparties (vendors, suppliers, clients) with total spend and entry count.",
    parameters: z.object({
      search: z.string().optional().describe("Filter by name"),
      limit: z.number().min(1).max(50).default(20).optional(),
    }),
    execute: async ({ search, limit }) => {
      const all = await getCounterparties(orgId)
      const filtered = search
        ? all.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : all
      return truncate(
        filtered.map((c) => ({
          id: c.id,
          name: c.name,
          totalSpent: c.totalSpent,
          entryCount: c._count.entries,
          lastEntryDate: c.lastEntryDate,
          defaultCategory: c.defaultCategory ? { name: c.defaultCategory.name } : null,
        })),
        limit ?? 20
      )
    },
  })

  const getMergeSuggestions = tool({
    description: "Find counterparties (vendors/clients) that are likely duplicates and should be merged, based on name similarity.",
    parameters: z.object({}),
    execute: async () => {
      const counterparties = await getCounterparties(orgId)
      const groups = computeMergeSuggestions(counterparties)
      return groups.slice(0, 10).map((g) => ({
        suggestedPrimaryName: g.key,
        counterparties: g.counterparties.map((c) => ({ id: c.id, name: c.name, entryCount: c._count.entries })),
        totalEntries: g.totalEntries,
      }))
    },
  })

  const listRecurringPatterns = tool({
    description: "List detected recurring payment patterns (subscriptions, payroll, rent, etc.) with their status and expected amounts.",
    parameters: z.object({
      status: z.enum(["active", "paused", "all"]).default("all").optional().describe("Filter by pattern status"),
    }),
    execute: async ({ status }) => {
      const { confirmed, suggested, paused, currency } = await getAllPatternsGrouped(orgId)

      const formatPattern = (p: { id: string; name: string; frequency: string; expectedAmount: number | null; confidenceScore: number | null; lastOccurrence: Date | null; counterparty: { name: string } | null; category: { name: string } | null }) => ({
        id: p.id,
        name: p.name,
        frequency: p.frequency,
        expectedAmount: p.expectedAmount,
        confidenceScore: p.confidenceScore,
        lastOccurrence: p.lastOccurrence,
        counterparty: p.counterparty?.name ?? null,
        category: p.category?.name ?? null,
      })

      if (status === "active") return { patterns: confirmed.map(formatPattern), currency }
      if (status === "paused") return { patterns: paused.map(formatPattern), currency }
      return {
        confirmed: confirmed.map(formatPattern),
        suggested: suggested.map(formatPattern),
        paused: paused.map(formatPattern),
        currency,
      }
    },
  })

  const listAlerts = tool({
    description: "List financial alerts (low balance, high spend, unusual activity, missed recurring payments, etc.).",
    parameters: z.object({
      isRead: z.boolean().optional().describe("Filter by read status. Omit to return all."),
      severity: z.enum(["critical", "warning", "info"]).optional().describe("Filter by severity"),
      limit: z.number().min(1).max(50).default(20).optional(),
    }),
    execute: async ({ isRead, severity, limit }) => {
      const result = await getAlerts({ isRead, severity }, 1, limit ?? 20, orgId)
      return {
        alerts: truncate(
          result.alerts.map((a) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            message: a.message,
            severity: a.severity,
            isRead: a.isRead,
            createdAt: a.createdAt,
          }))
        ),
        total: result.total,
      }
    },
  })

  const listInboxItems = tool({
    description: "List inbox/vault items (uploaded receipts and documents) and their transaction match status.",
    parameters: z.object({
      matchStatus: z.enum(["matched", "unmatched", "pending", "all"]).default("all").optional(),
      limit: z.number().min(1).max(50).default(20).optional(),
    }),
    execute: async ({ matchStatus, limit }) => {
      const statusFilter = matchStatus === "all" ? undefined : matchStatus
      const result = await getVaultItems(statusFilter, 1, limit ?? 20, orgId)
      return {
        items: truncate(
          result.items.map((item) => ({
            id: item.id,
            fileName: item.displayName ?? item.fileName,
            amount: item.amount,
            currency: item.currency,
            date: item.date,
            status: item.status,
            matchedTransaction: item.transaction
              ? { id: item.transaction.id, description: item.transaction.description }
              : null,
          }))
        ),
        total: result.total,
      }
    },
  })

  const listBankAccounts = tool({
    description: "List connected bank accounts with their current balances and sync status.",
    parameters: z.object({
      includeDisconnected: z.boolean().default(false).optional(),
    }),
    execute: async () => {
      const result = await getAccountsWithBalance(orgId)
      return {
        accounts: result.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          institutionName: (a as { institutionName?: string }).institutionName,
          balanceCurrent: a.balanceCurrent,
          balanceAvailable: a.balanceAvailable,
          currency: a.currency,
          status: a.status,
          lastSyncedAt: a.lastSyncedAt,
        })),
        totalBalance: result.totalBalance,
      }
    },
  })

  const getCashFlowTool = tool({
    description: "Get historical monthly cash flow (income vs expenses) for the last N months.",
    parameters: z.object({
      months: z.number().min(1).max(24).default(6).optional().describe("Number of months to include (default 6)"),
      endMonth: z.string().optional().describe("End month ISO date string, defaults to now"),
    }),
    execute: async ({ months, endMonth }) => {
      return getCashFlow(months ?? 6, endMonth ? new Date(endMonth) : undefined, orgId)
    },
  })

  const getCashFlowForecastTool = tool({
    description: "Get cash flow forecast for the next N months based on historical data and recurring patterns.",
    parameters: z.object({
      forecastMonths: z.number().min(1).max(6).default(3).optional(),
    }),
    execute: async ({ forecastMonths }) => {
      return getCashFlowForecast(forecastMonths ?? 3, orgId)
    },
  })

  const getRevenueForecastTool = tool({
    description: "Get a revenue/income forecast showing last month, current month, next month projection, quarter, and year estimates with confidence scores.",
    parameters: z.object({}),
    execute: async () => {
      return getRevenueForecast(orgId)
    },
  })

  const getExpenseForecastTool = tool({
    description: "Get an expense forecast with next month's projected spending breakdown by fixed/variable, category-level projections, and any spend alerts.",
    parameters: z.object({}),
    execute: async () => {
      return getExpenseForecast(orgId)
    },
  })

  const getCategoryBreakdownTool = tool({
    description: "Get spending breakdown by category for a given month, showing total amount and percentage per category.",
    parameters: z.object({
      date: z.string().optional().describe("Any date within the desired month, ISO string. Defaults to current month."),
    }),
    execute: async ({ date }) => {
      return getCategoryBreakdown(date ? new Date(date) : undefined, orgId)
    },
  })

  const getBurnAndRunway = tool({
    description: "Get the current monthly burn rate (average expenses) and runway (how many months of cash remain at current burn rate).",
    parameters: z.object({}),
    execute: async () => {
      return getBurnRateAndRunway(orgId)
    },
  })

  const getTopCounterpartiesTool = tool({
    description: "Get the top counterparties (vendors/clients) by spend for a given month.",
    parameters: z.object({
      limit: z.number().min(1).max(20).default(10).optional(),
      date: z.string().optional().describe("Any date within the desired month, ISO string. Defaults to current month."),
    }),
    execute: async ({ limit, date }) => {
      return getTopCounterparties(limit ?? 10, date ? new Date(date) : undefined, orgId)
    },
  })

  const getVATSummaryTool = tool({
    description:
      "Get quarterly VAT/IVA summary for the org: IVA collected (repercutido, from income) vs IVA paid (soportado, from expenses) and net amount to declare per quarter. Use this to answer questions about VAT obligations, Modelo 303 estimates, or how much VAT the user owes.",
    parameters: z.object({
      year: z.number().int().optional().describe("Fiscal year (defaults to current year)"),
    }),
    execute: async ({ year }) => {
      const summary = await getVATSummary(year, orgId)
      return {
        year: summary.year,
        currency: summary.currency,
        currentQuarter: summary.currentQuarter.quarter,
        quarters: summary.quarters.map((q) => ({
          quarter: q.quarter,
          collected: q.collected,
          paid: q.paid,
          net: q.net,
        })),
        ytdCollected: summary.ytdCollected,
        ytdPaid: summary.ytdPaid,
        ytdNet: summary.ytdNet,
      }
    },
  })

  const showMatchSuggestion = tool({
    description:
      "Display a match suggestion card so the user can confirm or decline the receipt-to-transaction match. Call this when a receipt upload results in a high-confidence or suggested match.",
    parameters: z.object({
      suggestionId: z.string().describe("The MatchSuggestion ID"),
      transactionId: z.string().describe("The matched Transaction ID"),
      confidence: z.number().min(0).max(1).describe("Match confidence score (0–1)"),
      transactionName: z.string().describe("Name or merchant of the matched transaction"),
      amount: z.number().describe("Transaction amount"),
      currency: z.string().describe("Transaction currency code"),
      date: z.string().describe("Transaction date as ISO string"),
    }),
    execute: async (params) => {
      // Return params as-is — the MatchSuggestionWidget handles rendering
      return params
    },
  })

  return {
    list_transactions: listTransactions,
    get_transaction: getTransaction,
    list_categories: listCategories,
    list_counterparties: listCounterparties,
    get_merge_suggestions: getMergeSuggestions,
    list_recurring_patterns: listRecurringPatterns,
    list_alerts: listAlerts,
    list_inbox_items: listInboxItems,
    list_bank_accounts: listBankAccounts,
    get_cash_flow: getCashFlowTool,
    get_cash_flow_forecast: getCashFlowForecastTool,
    get_revenue_forecast: getRevenueForecastTool,
    get_expense_forecast: getExpenseForecastTool,
    get_category_breakdown: getCategoryBreakdownTool,
    get_burn_and_runway: getBurnAndRunway,
    get_top_counterparties: getTopCounterpartiesTool,
    get_vat_summary: getVATSummaryTool,
    show_match_suggestion: showMatchSuggestion,
  }
}
