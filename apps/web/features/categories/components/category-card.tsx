"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Switch } from "@polso/ui/switch"
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
import { Pencil, Trash } from "@phosphor-icons/react"
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

  const entryCount = category._count.entries

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

                {isHidden && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t("hiddenBadge")}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{t("entryCount", { count: entryCount })}</span>
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
                        {entryCount > 0 ? (
                          <>
                            <p>
                              {t.rich("deleteCategoryHasExpenses", { count: entryCount, strong: (chunks) => <strong>{chunks}</strong> })}
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
                    {entryCount === 0 && (
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
