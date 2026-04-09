"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner, Trash, Sparkle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { CategorySelect } from "@/features/categories/components/category-select"
import { createVendorAction, updateVendorAction, deleteVendorAction } from "../actions/manage-vendor"
import type { VendorWithStats } from "../queries/get-vendors"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface VendorFormProps {
  vendor?: VendorWithStats | null
  categories: CategoryWithCount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NONE_VALUE = "__none__"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function VendorForm({ vendor, categories, open, onOpenChange }: VendorFormProps) {
  const t = useTranslations("vendors")
  const tc = useTranslations("common")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [taxId, setTaxId] = useState("")
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [defaultExpenseType, setDefaultExpenseType] = useState<string>(NONE_VALUE)

  const isEditing = !!vendor

  // Reset form when vendor changes or sheet opens
  useEffect(() => {
    if (open) {
      if (vendor) {
        setName(vendor.name)
        setWebsite(vendor.website || "")
        setTaxId(vendor.taxId || "")
        setDefaultCategoryId(vendor.defaultCategoryId)
        setDefaultExpenseType(vendor.defaultExpenseType || NONE_VALUE)
      } else {
        setName("")
        setWebsite("")
        setTaxId("")
        setDefaultCategoryId(null)
        setDefaultExpenseType(NONE_VALUE)
      }
      setError(null)
    }
  }, [vendor, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const expenseTypeValue = defaultExpenseType === NONE_VALUE ? null : defaultExpenseType

    const result = isEditing
      ? await updateVendorAction(vendor!.id, {
          name,
          website: website || null,
          taxId: taxId || null,
          defaultCategoryId,
          defaultExpenseType: expenseTypeValue as "fixed" | "variable" | null,
        })
      : await createVendorAction({
          name,
          website: website || null,
          taxId: taxId || null,
          defaultCategoryId,
          defaultExpenseType: expenseTypeValue as "fixed" | "variable" | null,
        })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    toast.success(isEditing ? "Vendor updated" : "Vendor created", {
      description: isEditing
        ? `${name} has been updated.`
        : `${name} has been created.`,
    })

    setLoading(false)
    onOpenChange(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!vendor) return

    setLoading(true)

    const result = await deleteVendorAction(vendor.id)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      setDeleteDialogOpen(false)
      return
    }

    toast.success("Vendor deleted", {
      description: `${vendor.name} has been deleted.`,
    })

    setLoading(false)
    setDeleteDialogOpen(false)
    onOpenChange(false)
    router.refresh()
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
                  {vendor.isAutoDetected && (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                      <Sparkle weight="fill" className="h-3 w-3" />
                      {t("form.autoDetected")}
                    </span>
                  )}
                  {vendor._count.expenses > 0 && (
                    <span>
                      {t("form.expenseCount", { count: vendor._count.expenses })} •{" "}
                      {formatCurrency(vendor.totalSpent)}
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
              <p className="text-xs text-muted-foreground">
                {t("form.taxIdDescription")}
              </p>
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
              <p className="text-xs text-muted-foreground">
                {t("form.defaultCategoryDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("form.defaultExpenseType")}</Label>
              <Select value={defaultExpenseType} onValueChange={setDefaultExpenseType}>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? tc("actions.saving") : tc("actions.loading")}
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
              {vendor && vendor._count.expenses > 0 ? (
                <>
                  {t("form.deleteHasExpenses", { count: vendor._count.expenses })}{" "}
                  {t("form.deleteReassign")}
                </>
              ) : (
                t("form.deleteConfirm", { name: vendor?.name ?? "" })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || (vendor?._count.expenses ?? 0) > 0}
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
