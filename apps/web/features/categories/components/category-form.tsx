"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
import { Spinner } from "@phosphor-icons/react"
import { createCategoryAction, updateCategoryAction } from "../actions/manage-category"
import { NONE_VALUE } from "../lib/constants"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategoryFormProps {
  category?: CategoryWithCount | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
]

export function CategoryForm({ category, open, onOpenChange }: CategoryFormProps) {
  const router = useRouter()
  const t = useTranslations("categories")
  const tc = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [entryType, setEntryType] = useState<string>(NONE_VALUE)

  const isEditing = !!category

  // Reset form when category changes or sheet opens
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name)
        setColor(category.color)
        setEntryType(category.entryType || NONE_VALUE)
      } else {
        setName("")
        setColor("#6366f1")
        setEntryType(NONE_VALUE)
      }
      setError(null)
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const entryTypeValue = entryType === NONE_VALUE ? null : entryType

    const result = isEditing
      ? await updateCategoryAction(category!.id, {
          name,
          color,
          entryType: entryTypeValue,
        })
      : await createCategoryAction({
          name,
          color,
          entryType: entryTypeValue,
        })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? t("form.editTitle") : t("form.newTitle")}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? t("form.editDescription")
              : t("form.newDescription")}
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
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("form.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`h-7 w-7 rounded-md border-2 transition-all ${
                    color === presetColor
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-14 p-1 cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6366f1"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-type">{t("form.defaultExpenseType")}</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("form.none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t("form.none")}</SelectItem>
                <SelectItem value="fixed">{t("form.fixed")}</SelectItem>
                <SelectItem value="variable">{t("form.variable")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("form.entryTypeDescription")}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <SheetFooter className="mt-auto p-0">
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
                  {isEditing ? tc("actions.saving") : tc("actions.creating")}
                </>
              ) : (
                isEditing ? tc("actions.saveChanges") : t("createCategory")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
