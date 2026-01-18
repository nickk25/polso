import { ClientsPageContent } from "@/features/clients/components/clients-page-content"
import { getClients } from "@/features/clients/queries/get-clients"
import { getAllCategories } from "@/features/categories/queries/get-categories"

export default async function ClientsPage() {
  const [clients, categories] = await Promise.all([
    getClients(),
    getAllCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-muted-foreground">
          Manage income sources and set default categories
        </p>
      </div>

      <ClientsPageContent clients={clients} categories={categories} />
    </div>
  )
}
