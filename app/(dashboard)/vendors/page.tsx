import { VendorsPageContent } from "@/features/vendors/components/vendors-page-content"
import { getVendors } from "@/features/vendors/queries/get-vendors"
import { getAllCategories } from "@/features/categories/queries/get-categories"
import { getTranslations } from "next-intl/server"

export default async function VendorsPage() {
  const t = await getTranslations("vendors")
  const [vendors, categories] = await Promise.all([
    getVendors(),
    getAllCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <VendorsPageContent vendors={vendors} categories={categories} />
    </div>
  )
}
