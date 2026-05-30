"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Plus, Storefront } from "@phosphor-icons/react"
import { VendorTable } from "./vendor-table"
import { VendorForm } from "./vendor-form"
import { VendorMergeDialog } from "./vendor-merge-dialog"
import { BackfillVendorsButton } from "./backfill-vendors-button"
import type { VendorWithStats } from "../queries/get-vendors"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface VendorsPageContentProps {
  vendors: VendorWithStats[]
  categories: CategoryWithCount[]
}

export function VendorsPageContent({ vendors, categories }: VendorsPageContentProps) {
  const t = useTranslations("vendors")
  const [formOpen, setFormOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<VendorWithStats | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleVendorClick = (vendor: VendorWithStats) => {
    setEditingVendor(vendor)
    setFormOpen(true)
  }

  const handleNewVendor = () => {
    setEditingVendor(null)
    setFormOpen(true)
  }

  const handleMergeClick = () => {
    setMergeOpen(true)
  }

  const handleMergeComplete = () => {
    setSelectedIds([])
  }

  if (vendors.length === 0) {
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
          <BackfillVendorsButton />
          <Button onClick={handleNewVendor}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addVendor")}
          </Button>
        </div>

        <VendorForm
          vendor={null}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-muted-foreground">
          {t("vendorCount", { count: vendors.length })}
        </p>
        <div className="flex gap-2">
          <BackfillVendorsButton />
          <Button onClick={handleNewVendor}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addVendor")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <VendorTable
        vendors={vendors}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onVendorClick={handleVendorClick}
        onMergeClick={handleMergeClick}
      />

      {/* Form Sheet */}
      <VendorForm
        vendor={editingVendor}
        categories={categories}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingVendor(null)
        }}
      />

      {/* Merge Dialog */}
      <VendorMergeDialog
        vendors={vendors}
        selectedIds={selectedIds}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        onMergeComplete={handleMergeComplete}
      />
    </div>
  )
}
