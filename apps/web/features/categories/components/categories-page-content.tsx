"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Plus, Tag, Lock } from "@phosphor-icons/react"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addCategory")}
        </Button>
      </div>

      {/* Custom Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{t("customCategories")}</h2>
          <span className="text-sm text-muted-foreground">
            ({customCategories.length})
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("customCategoriesDescription")}
        </p>

        {customCategories.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEditClick}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">{t("noCustomCategories")}</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {t("noCustomCategoriesDescription")}
              </p>
              <Button variant="outline" className="mt-4" onClick={handleAddClick}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createCategory")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-muted-foreground">{t("systemCategories")}</h2>
          <span className="text-sm text-muted-foreground">
            ({systemCategories.length})
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("systemCategoriesDescription")}
        </p>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {systemCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* Category Form Sheet */}
      <CategoryForm
        category={editingCategory}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}
