"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Spinner, GitMerge } from "@phosphor-icons/react"
import { toast } from "sonner"
import { mergeClientsAction } from "../actions/manage-client"
import type { ClientWithStats } from "../queries/get-clients"

interface ClientMergeDialogProps {
  clients: ClientWithStats[]
  selectedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function ClientMergeDialog({
  clients,
  selectedIds,
  open,
  onOpenChange,
  onComplete,
}: ClientMergeDialogProps) {
  const t = useTranslations("clients")
  const tc = useTranslations("common")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [targetId, setTargetId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Get selected clients
  const selectedClients = clients.filter((c) => selectedIds.includes(c.id))

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTargetId(selectedIds[0] || "")
      setError(null)
    }
    onOpenChange(open)
  }

  const handleMerge = async () => {
    if (!targetId) {
      setError("Please select a target client")
      return
    }

    setLoading(true)
    setError(null)

    const sourceIds = selectedIds.filter((id) => id !== targetId)

    const result = await mergeClientsAction({
      sourceClientIds: sourceIds,
      targetClientId: targetId,
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    const targetClient = selectedClients.find((c) => c.id === targetId)

    toast.success("Clients merged", {
      description: `${result.data.clientsDeleted} client${result.data.clientsDeleted > 1 ? "s" : ""} merged into "${targetClient?.name}". ${result.data.incomesReassigned} income${result.data.incomesReassigned > 1 ? "s" : ""} reassigned.`,
    })

    setLoading(false)
    onOpenChange(false)
    onComplete()
    router.refresh()
  }

  const totalIncomes = selectedClients.reduce(
    (sum, c) => sum + c._count.incomes,
    0
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t("merge.title", { count: selectedIds.length })}
          </DialogTitle>
          <DialogDescription>
            {t("merge.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("merge.keepClient")}</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder={t("merge.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {selectedClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{client.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {t("form.incomeCount", { count: client._count.incomes })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              {t("merge.mergeDescription", { mergeCount: selectedIds.length - 1, incomeCount: totalIncomes })}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
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
                {t("merge.title", { count: selectedIds.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
