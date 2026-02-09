import {
  Wallet,
  TrendUp,
  TrendDown,
  Clock,
  Receipt,
  ChartLineUp,
  List,
  Gear,
  House,
  ArrowsDownUp,
  Tag,
  Repeat,
  Export,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

// Mock data (non-translatable)
const cashFlowData = [
  { month: "Aug", inflow: 8200, outflow: 9100 },
  { month: "Sep", inflow: 11400, outflow: 7800 },
  { month: "Oct", inflow: 9600, outflow: 8200 },
  { month: "Nov", inflow: 13200, outflow: 9400 },
  { month: "Dec", inflow: 10800, outflow: 7200 },
  { month: "Jan", inflow: 12400, outflow: 8750 },
];

const recentTransactions = [
  { name: "Stripe", category: "Income", amount: "+€4,200", color: "#22c55e" },
  { name: "AWS", category: "Software", amount: "-€342", color: "#f97316" },
  {
    name: "Slack",
    category: "Subscriptions",
    amount: "-€15",
    color: "#8b5cf6",
  },
  {
    name: "Adobe",
    category: "Subscriptions",
    amount: "-€59",
    color: "#8b5cf6",
  },
];

export async function DashboardMockup() {
  const t = await getTranslations("marketing");

  const kpis = [
    {
      label: t("mockup.balance"),
      value: "€47,250",
      icon: Wallet,
      color: "text-foreground",
    },
    {
      label: t("mockup.income"),
      value: "+€12,400",
      icon: TrendUp,
      color: "text-green-500",
    },
    { label: t("mockup.expenses"), value: "-€8,750", icon: Receipt, color: "text-red-500" },
    {
      label: t("mockup.cashFlow"),
      value: "+€3,650",
      icon: TrendDown,
      color: "text-green-500",
    },
    { label: t("mockup.runway"), value: "5.4 mo", icon: Clock, color: "text-foreground" },
  ];

  const sidebarItems = [
    { icon: House, label: t("mockup.overview"), active: true },
    { icon: Receipt, label: t("mockup.expenses") },
    { icon: ArrowsDownUp, label: t("mockup.income") },
    { icon: ChartLineUp, label: "Analytics" },
    { icon: Repeat, label: t("mockup.recurring") },
    { icon: Tag, label: t("mockup.categories") },
    { icon: Export, label: t("mockup.export") },
    { icon: Gear, label: t("mockup.settings") },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 blur-3xl" />

      {/* Browser frame */}
      <div className="relative border bg-background shadow-2xl">
        {/* Browser header */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-sm border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <span>polso.app</span>
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-48 shrink-0 border-r bg-muted/20 p-3 md:block">
            <div className="mb-4 flex items-center gap-2 px-2">
              <div className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                P
              </div>
              <span className="text-sm font-semibold">Polso</span>
            </div>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs ${
                    item.active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <item.icon
                    className="h-4 w-4"
                    weight={item.active ? "fill" : "regular"}
                  />
                  {item.label}
                </div>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            {/* Page header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t("mockup.overview")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("mockup.financialOverview")}
              </p>
            </div>

            {/* KPI Cards */}
            <div className="mb-4 grid grid-cols-5 gap-2">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {kpi.label}
                    </span>
                    <kpi.icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className={`mt-1 text-sm font-bold ${kpi.color}`}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Two columns */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Cash Flow Chart */}
              <div className="flex flex-col border bg-card p-3">
                <div className="mb-auto flex items-center justify-between">
                  <span className="text-xs font-medium">{t("mockup.cashFlow6mo")}</span>
                  <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 bg-green-500" /> {t("mockup.income")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 bg-red-400" /> {t("mockup.expenses")}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-3 px-2">
                  {(() => {
                    const maxValue = Math.max(
                      ...cashFlowData.flatMap((d) => [d.inflow, d.outflow]),
                    );
                    return cashFlowData.map((month) => {
                      const inflowHeight = Math.round(
                        (month.inflow / maxValue) * 56,
                      );
                      const outflowHeight = Math.round(
                        (month.outflow / maxValue) * 56,
                      );
                      const isPositive = month.inflow > month.outflow;
                      return (
                        <div
                          key={month.month}
                          className="flex flex-1 flex-col items-center gap-1.5"
                        >
                          <div
                            className="flex items-end justify-center gap-1"
                            style={{ height: "56px" }}
                          >
                            <div
                              className="w-3 bg-green-500"
                              style={{ height: `${inflowHeight}px` }}
                            />
                            <div
                              className="w-3 bg-red-400"
                              style={{ height: `${outflowHeight}px` }}
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-muted-foreground">
                              {month.month}
                            </span>
                            <span
                              className={`text-[8px] font-semibold ${isPositive ? "text-green-500" : "text-red-400"}`}
                            >
                              {isPositive ? "+" : ""}
                              {((month.inflow - month.outflow) / 1000).toFixed(
                                1,
                              )}
                              k
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="border bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium">{t("mockup.recentActivity")}</span>
                  <List className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {recentTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-5 w-5 items-center justify-center text-[8px] font-medium"
                          style={{
                            backgroundColor: `${tx.color}20`,
                            color: tx.color,
                          }}
                        >
                          {tx.name[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium">{tx.name}</p>
                          <p className="text-[8px] text-muted-foreground">
                            {tx.category}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-medium ${tx.amount.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                      >
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
