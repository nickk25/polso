"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@polso/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@polso/ui/alert-dialog"
import { Spinner, Trash, Sparkle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format-currency"
import { CategorySelect } from "@/features/categories/components/category-select"
import {
  createCounterpartyAction,
  updateCounterpartyAction,
  deleteCounterpartyAction,
} from "../actions/manage-counterparty"
import type { CounterpartyWithStats } from "../queries/get-counterparties"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface CounterpartyFormProps {
  counterparty?: CounterpartyWithStats | null
  currency: string
  categories: CategoryWithCount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NONE_VALUE = "__none__"

export function CounterpartyForm({ counterparty, currency, categories, open, onOpenChange }: CounterpartyFormProps) {
  const t = useTranslations("counterparties")
  const tc = useTranslations("common")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [taxId, setTaxId] = useState("")
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [defaultEntryType, setDefaultEntryType] = useState<string>(NONE_VALUE)

  const isEditing = !!counterparty

  useEffect(() => {
    if (open) {
      if (counterparty) {
        setName(counterparty.name)
        setWebsite(counterparty.website || "")
        setTaxId(counterparty.taxId || "")
        setDefaultCategoryId(counterparty.defaultCategoryId)
        setDefaultEntryType(counterparty.defaultEntryType || NONE_VALUE)
      } else {
        setName("")
        setWebsite("")
        setTaxId("")
        setDefaultCategoryId(null)
        setDefaultEntryType(NONE_VALUE)
      }
      setError(null)
    }
  }, [counterparty, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const entryTypeValue = defaultEntryType === NONE_VALUE ? null : defaultEntryType
      const result = isEditing
        ? await updateCounterpartyAction(counterparty!.id, {
            name,
            website: website || null,
            taxId: taxId || null,
            defaultCategoryId,
            defaultEntryType: entryTypeValue as "fixed" | "variable" | null,
          })
        : await createCounterpartyAction({
            name,
            website: website || null,
            taxId: taxId || null,
            defaultCategoryId,
            defaultEntryType: entryTypeValue as "fixed" | "variable" | null,
          })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success(isEditing ? t("toasts.updated") : t("toasts.created"), {
        description: isEditing
          ? t("toasts.updatedDescription", { name })
          : t("toasts.createdDescription", { name }),
      })
      onOpenChange(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!counterparty) return
    setLoading(true)
    try {
      const result = await deleteCounterpartyAction(counterparty.id)

      if (!result.success) {
        setError(result.error)
        setDeleteDialogOpen(false)
        return
      }

      toast.success(t("toasts.deleted"), {
        description: t("toasts.deletedDescription", { name: counterparty.name }),
      })
      setDeleteDialogOpen(false)
      onOpenChange(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{isEditing ? t("form.editTitle") : t("form.newTitle")}</SheetTitle>
            <SheetDescription>
              {isEditing ? (
                <span className="flex items-center gap-2">
                  {counterparty.isAutoDetected && (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                      <Sparkle weight="fill" className="h-3 w-3" />
                      {t("form.autoDetected")}
                    </span>
                  )}
                  {counterparty._count.entries > 0 && (
                    <span>
                      {t("form.expenseCount", { count: counterparty._count.entries })} •{" "}
                      {formatCurrency(counterparty.totalSpent, currency)}
                    </span>
                  )}
                </span>
              ) : (
                t("form.newDescription")
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6 p-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">{t("form.website")}</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">{t("form.taxId")}</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={t("form.taxIdPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("form.taxIdDescription")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("form.defaultCategory")}</Label>
              <CategorySelect
                value={defaultCategoryId}
                onValueChange={setDefaultCategoryId}
                categories={categories}
                placeholder={t("form.noDefaultCategory")}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">{t("form.defaultCategoryDescription")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("form.defaultExpenseType")}</Label>
              <Select value={defaultEntryType} onValueChange={setDefaultEntryType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("form.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{t("form.none")}</SelectItem>
                  <SelectItem value="fixed">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      {t("form.fixed")}
                    </span>
                  </SelectItem>
                  <SelectItem value="variable">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {t("form.variable")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SheetFooter className="mt-auto p-0 gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={loading}
                  className="mr-auto"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {tc("actions.delete")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? tc("actions.saving") : tc("actions.creating")}
                  </>
                ) : isEditing ? (
                  tc("actions.saveChanges")
                ) : (
                  t("addVendor")
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("form.deleteVendor")}</AlertDialogTitle>
            <AlertDialogDescription>
              {counterparty && counterparty._count.entries > 0 ? (
                <>
                  {t("form.deleteHasExpenses", { count: counterparty._count.entries })}{" "}
                  {t("form.deleteReassign")}
                </>
              ) : (
                t("form.deleteConfirm", { name: counterparty?.name ?? "" })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || (counterparty?._count.entries ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  {tc("actions.deleting")}
                </>
              ) : (
                tc("actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
