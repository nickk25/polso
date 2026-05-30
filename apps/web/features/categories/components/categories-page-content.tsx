"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Plus, Tag, Lock } from "@phosphor-icons/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { CategoryCard } from "./category-card"
import { CategoryForm } from "./category-form"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategoriesPageContentProps {
  systemCategories: CategoryWithCount[]
  customCategories: CategoryWithCount[]
}

export function CategoriesPageContent({
  systemCategories,
  customCategories,
}: CategoriesPageContentProps) {
  const t = useTranslations("categories")
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)

  const handleAddClick = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const handleEditClick = (category: CategoryWithCount) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addCategory")}
        </Button>
      </div>

      {/* Custom Categories */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{t("customCategories")}</h2>
          <span className="text-xs text-muted-foreground">({customCategories.length})</span>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.type")}</TableHead>
                <TableHead>{t("table.entries")}</TableHead>
                <TableHead>{t("table.visible")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Tag className="h-8 w-8" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("noCustomCategories")}</p>
                        <p className="text-xs mt-0.5">{t("noCustomCategoriesDescription")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddClick}>
                        <Plus className="mr-2 h-3 w-3" />
                        {t("createCategory")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customCategories.map((category) => (
                  <CategoryCard key={category.id} category={category} onEdit={handleEditClick} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* System Categories */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground">{t("systemCategories")}</h2>
          <span className="text-xs text-muted-foreground">({systemCategories.length})</span>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.type")}</TableHead>
                <TableHead>{t("table.entries")}</TableHead>
                <TableHead>{t("table.visible")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CategoryForm category={editingCategory} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
