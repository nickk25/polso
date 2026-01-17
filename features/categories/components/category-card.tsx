"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { deleteCategoryAction } from "../actions/manage-category"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategoryCardProps {
  category: CategoryWithCount
  onEdit?: (category: CategoryWithCount) => void
}

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
                <h3 className="font-medium truncate">{category.name}</h3>
                {category.isSystem && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    System
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>
                  {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
                </span>
                {category.expenseType && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {category.expenseType}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!category.isSystem && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(category)}
                disabled={loading}
                title="Edit category"
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
                    title="Delete category"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                        {expenseCount > 0 ? (
                          <>
                            <p>
                              This category has <strong>{expenseCount} expense{expenseCount !== 1 ? "s" : ""}</strong> linked to it.
                            </p>
                            <p className="mt-2">
                              Please reassign these expenses to another category before deleting.
                            </p>
                          </>
                        ) : (
                          <p>
                            Are you sure you want to delete &quot;{category.name}&quot;? This action cannot be undone.
                          </p>
                        )}
                        {deleteError && (
                          <p className="mt-2 text-destructive">{deleteError}</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {expenseCount === 0 && (
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {loading ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
