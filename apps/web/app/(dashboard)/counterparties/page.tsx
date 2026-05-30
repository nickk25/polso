import { CounterpartiesPageContent } from "@/features/counterparties/components/counterparties-page-content"
import { getCounterparties, getOrgCurrency } from "@/features/counterparties/queries/get-counterparties"
import { getActiveCategories } from "@/features/categories/queries/get-categories"

export default async function CounterpartiesPage() {
  const [counterparties, categories, currency] = await Promise.all([
    getCounterparties(),
    getActiveCategories(),
    getOrgCurrency(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <CounterpartiesPageContent
        counterparties={counterparties}
        currency={currency}
        categories={categories}
      />
    </div>
  )
}
