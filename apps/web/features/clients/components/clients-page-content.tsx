"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "@phosphor-icons/react"
import { ClientTable } from "./client-table"
import { ClientForm } from "./client-form"
import { ClientMergeDialog } from "./client-merge-dialog"
import { BackfillClientsButton } from "./backfill-clients-button"
import type { ClientWithStats } from "../queries/get-clients"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface ClientsPageContentProps {
  clients: ClientWithStats[]
  categories: CategoryWithCount[]
}

export function ClientsPageContent({ clients, categories }: ClientsPageContentProps) {
  const t = useTranslations("clients")
  const [formOpen, setFormOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleClientClick = (client: ClientWithStats) => {
    setEditingClient(client)
    setFormOpen(true)
  }

  const handleNewClient = () => {
    setEditingClient(null)
    setFormOpen(true)
  }

  const handleMergeClick = () => {
    setMergeOpen(true)
  }

  const handleMergeComplete = () => {
    setSelectedIds([])
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("noClientsYet")}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {t("noClientsDescription")}
        </p>
        <div className="flex gap-2">
          <BackfillClientsButton />
          <Button onClick={handleNewClient}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addClient")}
          </Button>
        </div>

        <ClientForm
          client={null}
          categories={categories}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {t("clientCount", { count: clients.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <BackfillClientsButton />
          <Button onClick={handleNewClient}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addClient")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <ClientTable
        clients={clients}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onClientClick={handleClientClick}
        onMergeClick={handleMergeClick}
      />

      {/* Form Sheet */}
      <ClientForm
        client={editingClient}
        categories={categories}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingClient(null)
        }}
      />

      {/* Merge Dialog */}
      <ClientMergeDialog
        clients={clients}
        selectedIds={selectedIds}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        onComplete={handleMergeComplete}
      />
    </div>
  )
}
