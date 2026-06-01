"use client"

import { useState, useEffect, useMemo } from "react"
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
import { toast } from "@polso/ui/sonner"
import { formatCurrency } from "@/lib/format-currency"
import { mergeCounterpartiesAction } from "../actions/manage-counterparty"
import type { CounterpartyWithStats } from "../queries/get-counterparties"

interface CounterpartyMergeDialogProps {
  counterparties: CounterpartyWithStats[]
  currency: string
  selectedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onMergeComplete: () => void
}

export function CounterpartyMergeDialog({
  counterparties,
  currency,
  selectedIds,
  open,
  onOpenChange,
  onMergeComplete,
}: CounterpartyMergeDialogProps) {
  const t = useTranslations("counterparties")
  const tc = useTranslations("common")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [targetId, setTargetId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const selected = counterparties.filter((cp) => selectedIds.includes(cp.id))
  const totalExpenses = selected.reduce((sum, cp) => sum + cp._count.entries, 0)
  const totalSpent = selected.reduce((sum, cp) => sum + cp.totalSpent, 0)

  const defaultTargetId = useMemo(() => {
    const sorted = [...selected].sort((a, b) => b._count.entries - a._count.entries)
    return sorted[0]?.id ?? ""
  }, [selected])

  useEffect(() => {
    if (open) {
      setTargetId(defaultTargetId)
      setError(null)
    }
  }, [open, defaultTargetId])

  const handleMerge = async () => {
    if (!targetId) {
      setError(t("merge.selectTargetError"))
      return
    }

    const sourceIds = selectedIds.filter((id) => id !== targetId)
    if (sourceIds.length === 0) {
      setError(t("merge.noVendorsToMerge"))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await mergeCounterpartiesAction({ sourceIds, targetId })

      if (!result.success) {
        setError(result.error)
        return
      }

      const mergedTarget = counterparties.find((cp) => cp.id === targetId)
      toast.success(t("toasts.merged"), {
        description: t("toasts.mergedDescription", {
          deletedCount: result.data.deletedCount,
          targetName: mergedTarget?.name ?? "",
          entriesReassigned: result.data.entriesReassigned,
        }),
      })
      onOpenChange(false)
      onMergeComplete()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const target = counterparties.find((cp) => cp.id === targetId)
  const sources = selected.filter((cp) => cp.id !== targetId)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t("merge.title")}
          </DialogTitle>
          <DialogDescription>
            {t("merge.description", { count: selected.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("merge.keepTarget")}</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder={t("merge.selectTarget")} />
              </SelectTrigger>
              <SelectContent>
                {selected.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    <span className="flex items-center gap-2">
                      {cp.name}
                      <span className="text-muted-foreground text-xs">
                        ({cp._count.entries} transactions)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target && sources.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">{t("merge.whatWillHappen")}</p>
              <div className="space-y-2">
                {sources.map((cp) => (
                  <div key={cp.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="line-through">{cp.name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">{target.name}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t text-sm">
                <p><strong>{totalExpenses}</strong> {t("merge.willBeReassigned")}</p>
                <p className="text-muted-foreground">
                  {t("merge.totalValue")} {formatCurrency(totalSpent, currency)}
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
          <Button onClick={handleMerge} disabled={loading || !targetId}>
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
