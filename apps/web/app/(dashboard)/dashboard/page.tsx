import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import {
  Wallet,
  TrendDown,
  TrendUp,
  Clock,
  Receipt,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Bank,
  Warning,
} from "@phosphor-icons/react/dist/ssr"
import { getAccountsSummary, getAccounts } from "@/features/banking/queries/get-accounts"
import { getExpenseStats, getRecentExpenses } from "@/features/expenses/queries/get-expenses"
import { getIncomeStats, getRecentIncomes } from "@/features/income/queries/get-income"
import { getBurnRateAndRunway, getCashFlow, getCategoryBreakdown } from "@/features/analytics/queries/get-analytics"
import { MiniCashFlowChart } from "@/features/analytics/components/mini-cash-flow-chart"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@polso/ui/button"
import { getTranslations } from "next-intl/server"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const tc = await getTranslations("common")

  const [accountsSummary, accounts, expenseStats, incomeStats, burnRateData, cashFlow, recentExpenses, recentIncomes, categoryBreakdown] = await Promise.all([
    getAccountsSummary(),
    getAccounts(),
    getExpenseStats(),
    getIncomeStats(),
    getBurnRateAndRunway(),
    getCashFlow(6),
    getRecentExpenses(5),
    getRecentIncomes(3),
    getCategoryBreakdown(),
  ])

  const currency = accountsSummary.currency || "USD"
  const activeAccounts = accounts.filter((a) => a.status !== "disconnected")
  const totalExpenses = expenseStats.totalThisMonth
  const totalIncome = incomeStats.totalThisMonth
  const netCashFlow = totalIncome - totalExpenses
  const fixedExpenses = expenseStats.fixedThisMonth
  const variableExpenses = expenseStats.variableThisMonth
  const fixedPercent = totalExpenses > 0 ? (fixedExpenses / totalExpenses) * 100 : 0
  const variablePercent = totalExpenses > 0 ? (variableExpenses / totalExpenses) * 100 : 0
  const hasCashFlowData = cashFlow.length > 0 && cashFlow.some((d) => d.inflow > 0 || d.outflow > 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("currentBalance")}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountsSummary.totalCurrent, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accountsSummary.accountCount === 0
                ? t("noAccountsConnected")
                : t("acrossAccounts", { count: accountsSummary.accountCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("monthlyIncome")}</CardTitle>
            <TrendUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +{formatCurrency(totalIncome, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("transactionsThisMonth", { count: incomeStats.incomeCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("monthlyExpenses")}</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              -{formatCurrency(totalExpenses, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("transactionsThisMonth", { count: expenseStats.expenseCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("netCashFlow")}</CardTitle>
            {netCashFlow >= 0 ? (
              <TrendUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
              {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("incomeMinusExpenses")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("runway")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {burnRateData.runway > 0 ? burnRateData.runway.toFixed(1) : "∞"}
              <span className="text-sm font-normal text-muted-foreground"> mo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("atCurrentBurnRate")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed, Variable & Cash Flow Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("fixedExpenses")}</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(fixedExpenses, currency)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${fixedPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {fixedPercent.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("variableExpenses")}</CardTitle>
            <ArrowUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(variableExpenses, currency)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${variablePercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {variablePercent.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact Cash Flow */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("cashFlow6mo")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasCashFlowData ? (
              <MiniCashFlowChart data={cashFlow} currency={currency} />
            ) : (
              <div className="flex h-[76px] items-center justify-center text-sm text-muted-foreground">
                {t("noDataYet")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two Big Blocks: Recent Transactions & Top Categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Transactions - Combined Expenses & Income */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentActivity")}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/expenses">
                  {tc("navigation.expenses")}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/incomes">
                  {tc("navigation.income")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {recentExpenses.length > 0 || recentIncomes.length > 0 ? (
              <div className="space-y-3">
                {/* Recent Income */}
                {recentIncomes.map((income) => (
                  <div key={`income-${income.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-green-500/10 text-green-500">
                        <TrendUp className="h-4 w-4" weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {income.transaction?.merchantName ||
                            income.transaction?.name ||
                            income.description ||
                            "Income"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(income.date), "MMM d")}
                          {" · "}
                          <span className="capitalize">{income.source}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0 ml-2 text-green-500">
                      +{formatCurrencyCompact(income.amount, income.currency)}
                    </span>
                  </div>
                ))}
                {/* Recent Expenses */}
                {recentExpenses.map((expense) => (
                  <div key={`expense-${expense.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: expense.category?.color ? `${expense.category.color}20` : 'var(--muted)',
                          color: expense.category?.color || 'var(--muted-foreground)'
                        }}
                      >
                        {(expense.vendor?.name || expense.transaction?.merchantName || expense.description || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {expense.vendor?.name ||
                            expense.transaction?.merchantName ||
                            expense.transaction?.name ||
                            expense.description ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), "MMM d")}
                          {expense.category && ` · ${expense.category.name}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0 ml-2 text-red-500">
                      -{formatCurrencyCompact(expense.amount, expense.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t("noTransactionsYet")}</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/settings/banking">{t("connectBank")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts & Top Categories */}
        <div className="flex flex-col gap-4">
          {/* Connected Accounts Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("connectedAccounts")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings/banking">
                  {t("manage")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeAccounts.length > 0 ? (
                <div className="max-h-[280px] overflow-y-auto space-y-4">
                  {activeAccounts.map((account) => (
                    <div key={account.id} className="space-y-1 pb-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {account.institutionLogo ? (
                            <img
                              src={account.institutionLogo.startsWith("data:") ? account.institutionLogo : `data:image/png;base64,${account.institutionLogo}`}
                              alt=""
                              className="h-5 w-5 rounded shrink-0"
                            />
                          ) : (
                            <Bank className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {account.name}
                            {account.mask && <span className="text-muted-foreground"> ••{account.mask}</span>}
                          </span>
                        </div>
                        {account.lastSyncedAt ? (
                          <span className="text-[10px] text-muted-foreground/70 shrink-0 ml-2">
                            Synced {format(new Date(account.lastSyncedAt), "MMM d, h:mm a")}
                          </span>
                        ) : account.status === "error" ? (
                          <Warning className="h-3.5 w-3.5 text-red-500 shrink-0 ml-2" weight="fill" />
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pl-7">
                        <div className="flex items-center gap-3">
                          <span>
                            Avail: <span className="text-foreground">{formatCurrency(account.balanceAvailable || 0, account.currency)}</span>
                          </span>
                          <span>
                            Curr: <span className="text-foreground">{formatCurrency(account.balanceCurrent || 0, account.currency)}</span>
                          </span>
                        </div>
                        <span>{account._count.transactions} txns</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/settings/banking">
                      <Bank className="mr-2 h-4 w-4" />
                      {t("connectYourFirstAccount")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Spending Categories */}
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("topCategories")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">
                  {t("details")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <div className="max-h-[200px] overflow-y-auto space-y-3">
                  {categoryBreakdown.map((category) => (
                    <div key={category.categoryId || "uncategorized"} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.categoryColor }}
                          />
                          <span className="truncate">{category.categoryName}</span>
                        </div>
                        <span className="font-medium shrink-0 ml-2">
                          {formatCurrency(category.total, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: category.categoryColor,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  {t("noExpensesThisMonth")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
