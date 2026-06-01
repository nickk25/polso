"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { toast } from "@polso/ui/sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@polso/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@polso/ui/alert-dialog"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Separator } from "@polso/ui/separator"
import {
  FilePdf,
  FileImage,
  CheckCircle,
  XCircle,
  LinkBreak,
  Spinner,
  Question,
  Trash,
} from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/format-currency"
import type { VaultItem } from "@/features/inbox/queries/get-vault"
import type { TransactionSearchResult } from "@/features/inbox/actions/vault-actions"
import {
  confirmMatchAction,
  rejectMatchAction,
  manualMatchAction,
  unmatchAction,
  deleteInboxItemAction,
} from "@/features/inbox/actions/vault-actions"
import { deleteTransactionDocumentAction } from "@/features/transactions/actions/document-actions"
import { VaultTransactionPicker } from "./vault-transaction-picker"

interface VaultItemSheetProps {
  item: VaultItem | null
  open: boolean
  onClose: () => void
}

function DeleteConfirmButton({
  onConfirm,
  disabled,
  pending,
  linked = false,
}: {
  onConfirm: () => void
  disabled: boolean
  pending: boolean
  linked?: boolean
}) {
  const t = useTranslations("vault")
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {pending
            ? <Spinner className="h-4 w-4 animate-spin" />
            : <Trash className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sheet.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {linked
              ? t("sheet.deleteConfirmDescriptionLinked")
              : t("sheet.deleteConfirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("sheet.deleteConfirmCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t("sheet.deleteConfirmConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function VaultItemSheet({ item, open, onClose }: VaultItemSheetProps) {
  const t = useTranslations("vault")
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const loading = pendingAction !== null

  async function run(action: () => Promise<{ success: boolean; error?: string }>, key: string, successMsg?: string) {
    setPendingAction(key)
    try {
      const result = await action()
      if (!result.success) throw new Error(result.error)
      if (successMsg) toast.success(successMsg)
      router.refresh()
      onClose()
    } catch {
      toast.error(t("sheet.actionFailed"))
    } finally {
      setPendingAction(null)
    }
  }

  function handleTransactionSelected(tx: TransactionSearchResult) {
    if (!item) return
    setShowPicker(false)
    run(() => manualMatchAction(item.id, tx.id), "manual")
  }

  function btnIcon(key: string, Icon: React.ElementType) {
    return pendingAction === key
      ? <Spinner className="h-4 w-4 mr-1 animate-spin" />
      : <Icon className="h-4 w-4 mr-1" />
  }

  if (!item) return null

  const isPdf = item.fileName.toLowerCase().endsWith(".pdf")
  const FileIcon = isPdf ? FilePdf : FileImage
  const fileIconClass = isPdf ? "text-red-500" : "text-blue-500"

  const tx = item.transaction ?? item.matchSuggestion?.transaction ?? null
  const txDisplay = tx ? (tx.merchantName ?? tx.description ?? t("table.transactionFallback")) : null
  const isLegacy = !!item.legacyDocId

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setShowPicker(false); onClose() } }}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{t("sheet.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col flex-1 gap-5 px-6 pb-6 overflow-y-auto">
          {/* Document info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <FileIcon className={`h-8 w-8 shrink-0 mt-0.5 ${fileIconClass}`} weight="fill" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-medium text-sm truncate">{item.displayName ?? item.fileName}</p>
              <p className="text-xs text-muted-foreground truncate">{item.fileName}</p>
              {item.amount != null && (
                <p className="text-sm font-semibold">
                  {formatCurrency(item.amount, item.currency)}
                </p>
              )}
              {item.date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.date), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Status-specific content */}
          {item.status === "processing" && (
            <div className="space-y-2 text-center py-4">
              <Spinner className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm font-medium">{t("sheet.processing")}</p>
              <p className="text-xs text-muted-foreground">{t("sheet.processingHint")}</p>
            </div>
          )}

          {item.status === "done" && tx && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                <span className="text-sm font-medium">{t("sheet.matchedTo")}</span>
              </div>
              <div className="p-3 rounded-lg border bg-background space-y-0.5">
                <p className="font-medium text-sm">{txDisplay}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM d, yyyy")}
                  {" · "}
                  {formatCurrency(tx.amount, item.currency)}
                </p>
              </div>
              <div className="flex gap-2">
                {!isLegacy && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => run(() => unmatchAction(item.id), "unlink")}
                  >
                    {btnIcon("unlink", LinkBreak)}
                    {t("sheet.unlink")}
                  </Button>
                )}
                <DeleteConfirmButton
                  disabled={loading}
                  pending={pendingAction === "delete"}
                  linked
                  onConfirm={() =>
                    isLegacy
                      ? run(() => deleteTransactionDocumentAction(item.legacyDocId!), "delete", t("sheet.deleted"))
                      : run(() => deleteInboxItemAction(item.id), "delete", t("sheet.deleted"))
                  }
                />
              </div>
            </div>
          )}

          {/* suggested_match with active suggestion */}
          {item.status === "suggested_match" && item.matchSuggestion && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Question className="h-4 w-4 text-amber-500" weight="fill" />
                  <span className="text-sm font-medium">{t("sheet.suggestedMatch")}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {t("sheet.confidence", {
                    value: Math.round(item.matchSuggestion.confidenceScore * 100),
                  })}
                </Badge>
              </div>

              <div className="p-3 rounded-lg border bg-background space-y-0.5">
                <p className="font-medium text-sm">
                  {item.matchSuggestion.transaction.merchantName ??
                    item.matchSuggestion.transaction.description ??
                    t("table.transactionFallback")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.matchSuggestion.transaction.date), "MMM d, yyyy")}
                  {" · "}
                  {formatCurrency(item.matchSuggestion.transaction.amount, item.currency)}
                </p>
              </div>

              {!showPicker ? (
                <>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={loading}
                      onClick={() => run(() => confirmMatchAction(item.matchSuggestion!.id), "confirm")}
                    >
                      {btnIcon("confirm", CheckCircle)}
                      {t("sheet.confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => run(() => rejectMatchAction(item.matchSuggestion!.id), "reject")}
                    >
                      {btnIcon("reject", XCircle)}
                      {t("sheet.reject")}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-muted-foreground"
                      onClick={() => setShowPicker(true)}
                      disabled={loading}
                    >
                      {t("sheet.findManually")}
                    </Button>
                    <DeleteConfirmButton
                      disabled={loading}
                      pending={pendingAction === "delete"}
                      onConfirm={() => run(() => deleteInboxItemAction(item.id), "delete", t("sheet.deleted"))}
                    />
                  </div>
                </>
              ) : (
                <VaultTransactionPicker
                  onSelect={handleTransactionSelected}
                  onCancel={() => setShowPicker(false)}
                  disabled={loading}
                />
              )}
            </div>
          )}

          {/* suggested_match where the suggestion was already actioned (stale) */}
          {item.status === "suggested_match" && !item.matchSuggestion && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("sheet.noMatch")}</p>
              <p className="text-xs text-muted-foreground">{t("sheet.noMatchHint")}</p>
              {!showPicker ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setShowPicker(true)} disabled={loading}>
                    {t("sheet.findManually")}
                  </Button>
                  <DeleteConfirmButton
                    disabled={loading}
                    pending={pendingAction === "delete"}
                    onConfirm={() => run(() => deleteInboxItemAction(item.id), "delete", t("sheet.deleted"))}
                  />
                </div>
              ) : (
                <VaultTransactionPicker
                  onSelect={handleTransactionSelected}
                  onCancel={() => setShowPicker(false)}
                  disabled={loading}
                />
              )}
            </div>
          )}

          {(item.status === "no_match" || item.status === "new") && (
            <div className="space-y-3">
              {!showPicker ? (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" weight="fill" />
                    <span className="text-sm text-muted-foreground">{t("sheet.noMatch")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("sheet.noMatchHint")}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowPicker(true)}
                      disabled={loading}
                    >
                      {t("sheet.findManually")}
                    </Button>
                    <DeleteConfirmButton
                      disabled={loading}
                      pending={pendingAction === "delete"}
                      onConfirm={() => run(() => deleteInboxItemAction(item.id), "delete", t("sheet.deleted"))}
                    />
                  </div>
                </>
              ) : (
                <VaultTransactionPicker
                  onSelect={handleTransactionSelected}
                  onCancel={() => setShowPicker(false)}
                  disabled={loading}
                />
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
