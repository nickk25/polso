import { VendorsPageContent } from "@/features/vendors/components/vendors-page-content"
import { getVendors } from "@/features/vendors/queries/get-vendors"
import { getActiveCategories } from "@/features/categories/queries/get-categories"

export default async function CounterpartiesPage() {
  const [vendors, categories] = await Promise.all([
    getVendors(),
    getActiveCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <VendorsPageContent vendors={vendors} categories={categories} />
    </div>
  )
}
