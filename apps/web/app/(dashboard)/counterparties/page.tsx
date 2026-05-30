import { VendorsPageContent } from "@/features/vendors/components/vendors-page-content"
import { getVendors } from "@/features/vendors/queries/get-vendors"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { getTranslations } from "next-intl/server"

export default async function CounterpartiesPage() {
  const t = await getTranslations("vendors")
  const [vendors, categories] = await Promise.all([
    getVendors(),
    getActiveCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <VendorsPageContent vendors={vendors} categories={categories} />
    </div>
  )
}
