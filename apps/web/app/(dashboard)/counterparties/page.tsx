import { CounterpartiesPageContent } from "@/features/counterparties/components/counterparties-page-content"
import { getCounterparties } from "@/features/counterparties/queries/get-counterparties"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"

export default async function CounterpartiesPage() {
  const { organizationId } = await getAuthContext()
  const [counterparties, categories, org] = await Promise.all([
    getCounterparties(),
    getActiveCategories(),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    }),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <CounterpartiesPageContent
        counterparties={counterparties}
        currency={org?.currency ?? "EUR"}
        categories={categories}
      />
    </div>
  )
}
