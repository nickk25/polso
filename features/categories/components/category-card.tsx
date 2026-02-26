"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
} from "@/components/ui/alert-dialog"
import { Pencil, Trash, Lock } from "@phosphor-icons/react"
import { deleteCategoryAction, toggleCategoryVisibilityAction } from "../actions/manage-category"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategoryCardProps {
  category: CategoryWithCount
  onEdit?: (category: CategoryWithCount) => void
}

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const router = useRouter()
  const t = useTranslations("categories")
  const tc = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(category.isHidden)

  const handleToggleVisibility = async (hidden: boolean) => {
    setIsHidden(hidden)
    await toggleCategoryVisibilityAction(category.id, hidden)
    router.refresh()
  }

  const handleDelete = async () => {
    setLoading(true)
    setDeleteError(null)

    const result = await deleteCategoryAction(category.id)

    if (!result.success) {
      setDeleteError(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  const expenseCount = category._count.expenses
  const incomeCount = category._count.incomes

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-medium truncate ${isHidden ? "text-muted-foreground" : ""}`}>{category.name}</h3>
                {category.isSystem && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    {t("system")}
                  </Badge>
                )}
                {isHidden && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t("hiddenBadge")}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>
                  {t("expenseCount", { count: expenseCount })}
                  {incomeCount > 0 && (
                    <span className="text-xs ml-1.5">
                      {"| "}{t("incomeCount", { count: incomeCount })}
                    </span>
                  )}
                </span>
                {category.expenseType && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {category.expenseType}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={!isHidden}
              onCheckedChange={(checked) => handleToggleVisibility(!checked)}
              title={isHidden ? t("showCategory") : t("hideCategory")}
            />

            {!category.isSystem && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(category)}
                  disabled={loading}
                  title={t("editCategory")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={loading}
                    title={t("deleteCategory")}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteCategoryTitle")}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                        {expenseCount > 0 ? (
                          <>
                            <p>
                              {t.rich("deleteCategoryHasExpenses", { count: expenseCount, strong: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                            <p className="mt-2">
                              {t("deleteCategoryReassign")}
                            </p>
                          </>
                        ) : (
                          <p>
                            {t("deleteCategoryConfirm", { name: category.name })}
                          </p>
                        )}
                        {deleteError && (
                          <p className="mt-2 text-destructive">{deleteError}</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                    {expenseCount === 0 && (
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {loading ? tc("actions.deleting") : tc("actions.delete")}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
