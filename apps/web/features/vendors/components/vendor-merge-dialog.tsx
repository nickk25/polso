"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Label } from "@polso/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@polso/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Spinner, GitMerge, ArrowRight } from "@phosphor-icons/react"
import { toast } from "sonner"
import { mergeVendorsAction } from "../actions/manage-vendor"
import type { VendorWithStats } from "../queries/get-vendors"

interface VendorMergeDialogProps {
  vendors: VendorWithStats[]
  selectedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onMergeComplete: () => void
}

export function VendorMergeDialog({
  vendors,
  selectedIds,
  open,
  onOpenChange,
  onMergeComplete,
}: VendorMergeDialogProps) {
  const t = useTranslations("vendors")
  const tc = useTranslations("common")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [targetVendorId, setTargetVendorId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Get selected vendors
  const selectedVendors = vendors.filter((v) => selectedIds.includes(v.id))

  // Calculate totals
  const totalExpenses = selectedVendors.reduce((sum, v) => sum + v._count.entries, 0)
  const totalSpent = selectedVendors.reduce((sum, v) => sum + v.totalSpent, 0)

  // Reset target when dialog opens or selection changes
  useEffect(() => {
    if (open && selectedIds.length > 0) {
      // Default to the vendor with the most expenses
      const sorted = [...selectedVendors].sort(
        (a, b) => b._count.entries - a._count.entries
      )
      setTargetVendorId(sorted[0]?.id || "")
      setError(null)
    }
  }, [open, selectedIds])

  const handleMerge = async () => {
    if (!targetVendorId) {
      setError(t("merge.selectTargetError"))
      return
    }

    const sourceIds = selectedIds.filter((id) => id !== targetVendorId)
    if (sourceIds.length === 0) {
      setError(t("merge.noVendorsToMerge"))
      return
    }

    setLoading(true)
    setError(null)

    const result = await mergeVendorsAction({
      sourceVendorIds: sourceIds,
      targetVendorId,
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    const targetVendor = vendors.find((v) => v.id === targetVendorId)

    toast.success("Vendors merged", {
      description: `${result.data.vendorsDeleted} vendor${result.data.vendorsDeleted > 1 ? "s" : ""} merged into ${targetVendor?.name}. ${result.data.entriesReassigned} transaction${result.data.entriesReassigned > 1 ? "s" : ""} reassigned.`,
    })

    setLoading(false)
    onOpenChange(false)
    onMergeComplete()
    router.refresh()
  }

  const targetVendor = vendors.find((v) => v.id === targetVendorId)
  const sourceVendors = selectedVendors.filter((v) => v.id !== targetVendorId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t("merge.title")}
          </DialogTitle>
          <DialogDescription>
            {t("merge.description", { count: selectedVendors.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("merge.keepTarget")}</Label>
            <Select value={targetVendorId} onValueChange={setTargetVendorId}>
              <SelectTrigger>
                <SelectValue placeholder={t("merge.selectTarget")} />
              </SelectTrigger>
              <SelectContent>
                {selectedVendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    <span className="flex items-center gap-2">
                      {vendor.name}
                      <span className="text-muted-foreground text-xs">
                        ({vendor._count.entries} transactions)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetVendor && sourceVendors.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">{t("merge.whatWillHappen")}</p>
              <div className="space-y-2">
                {sourceVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="line-through">{vendor.name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">
                      {targetVendor.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t text-sm">
                <p>
                  <strong>{totalExpenses}</strong> {t("merge.willBeReassigned")}
                </p>
                <p className="text-muted-foreground">
                  {t("merge.totalValue")} ${totalSpent.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("actions.cancel")}
          </Button>
          <Button onClick={handleMerge} disabled={loading || !targetVendorId}>
            {loading ? (
              <>
                <Spinner className="h-4 w-4 mr-2 animate-spin" />
                {tc("actions.loading")}
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                {t("merge.title")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
