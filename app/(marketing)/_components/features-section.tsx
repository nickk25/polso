import {
  Bank,
  Tag,
  Repeat,
  ChartLineUp,
  ArrowsDownUp,
  Bell,
  Export,
} from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"

export async function FeaturesSection() {
  const t = await getTranslations("marketing")

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("features.label")}
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("features.title")}
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          {/* Real-time dashboard - Hero feature, spans 2x2 */}
          <div className="group relative flex flex-col border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-lg md:col-span-2 md:row-span-2">
            <div className="absolute -top-2 right-4 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {t("features.liveMetrics")}
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center bg-primary/10">
              <ChartLineUp className="h-7 w-7 text-primary" weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold">{t("features.realtimeDashboard")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("features.realtimeDashboardDesc")}
            </p>
            <div className="mt-auto pt-6">
              <div className="grid grid-cols-3 gap-2">
                <div className="border bg-background/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground">{t("features.balance")}</p>
                  <p className="text-sm font-semibold">€47k</p>
                </div>
                <div className="border bg-background/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground">{t("features.burn")}</p>
                  <p className="text-sm font-semibold text-red-500">€8.7k</p>
                </div>
                <div className="border bg-background/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground">{t("features.runway")}</p>
                  <p className="text-sm font-semibold">5.4mo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank sync - spans 2 cols */}
          <div className="group relative border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg md:col-span-2">
            <div className="absolute -top-2 right-4 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {t("features.banks12000")}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10">
                <Bank className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t("features.bankSync")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("features.bankSyncDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Smart categorization - spans 2 cols */}
          <div className="group relative border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg md:col-span-2">
            <div className="absolute -top-2 right-4 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {t("features.accuracy95")}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10">
                <Tag className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t("features.smartCategorization")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("features.smartCategorizationDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Recurring detection */}
          <div className="group relative border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg md:col-span-2">
            <div className="absolute -top-2 right-4 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {t("features.autoDetect")}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10">
                <Repeat className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t("features.recurringDetection")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("features.recurringDetectionDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Export for accountant - Hero feature, spans 2x2 */}
          <div className="group relative flex flex-col border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-lg md:col-span-2 md:row-span-2">
            <div className="absolute -top-2 right-4 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {t("features.oneClick")}
            </div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center bg-primary/10">
              <Export className="h-7 w-7 text-primary" weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold">{t("features.exportForAccountant")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("features.exportForAccountantDesc")}
            </p>
            <div className="mt-auto pt-6">
              <div className="flex flex-wrap gap-2">
                <span className="border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                  expenses.csv
                </span>
                <span className="border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                  report.pdf
                </span>
                <span className="border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                  /receipts
                </span>
              </div>
            </div>
          </div>

          {/* Income tracking */}
          <div className="group border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10">
                <ArrowsDownUp className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t("features.incomeTracking")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("features.incomeTrackingDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Smart alerts */}
          <div className="group border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10">
                <Bell className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t("features.smartAlerts")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("features.smartAlertsDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
