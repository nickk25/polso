"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Plus, Storefront } from "@phosphor-icons/react"
import { CounterpartyTable } from "./counterparty-table"
import { CounterpartyForm } from "./counterparty-form"
import { CounterpartyMergeDialog } from "./counterparty-merge-dialog"
import { BackfillCounterpartiesButton } from "./backfill-counterparties-button"
import type { CounterpartyWithStats } from "../queries/get-counterparties"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface CounterpartiesPageContentProps {
  counterparties: CounterpartyWithStats[]
  currency: string
  categories: CategoryWithCount[]
}

export function CounterpartiesPageContent({ counterparties, currency, categories }: CounterpartiesPageContentProps) {
  const t = useTranslations("counterparties")
  const [formOpen, setFormOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [editing, setEditing] = useState<CounterpartyWithStats | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleRowClick = (cp: CounterpartyWithStats) => {
    setEditing(cp)
    setFormOpen(true)
  }

  const handleNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  if (counterparties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Storefront className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("noVendorsYet")}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {t("noVendorsDescription")}
        </p>
        <div className="flex gap-2">
          <BackfillCounterpartiesButton />
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addVendor")}
          </Button>
        </div>

        <CounterpartyForm
          counterparty={null}
          currency={currency}
          categories={categories}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <BackfillCounterpartiesButton />
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addVendor")}
          </Button>
        </div>
      </div>

      <CounterpartyTable
        counterparties={counterparties}
        currency={currency}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        onMergeClick={() => setMergeOpen(true)}
      />

      <CounterpartyForm
        counterparty={editing}
        currency={currency}
        categories={categories}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
      />

      <CounterpartyMergeDialog
        counterparties={counterparties}
        currency={currency}
        selectedIds={selectedIds}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        onMergeComplete={() => setSelectedIds([])}
      />
    </div>
  )
}
