"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-muted-foreground">
            Organize your expenses with custom categories
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Custom Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Custom Categories</h2>
          <span className="text-sm text-muted-foreground">
            ({customCategories.length})
          </span>
        </div>

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
              <h3 className="font-medium">No custom categories</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Create custom categories to better organize your expenses.
              </p>
              <Button variant="outline" className="mt-4" onClick={handleAddClick}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-muted-foreground">System Categories</h2>
          <span className="text-sm text-muted-foreground">
            ({systemCategories.length})
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Default categories available to all organizations.
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
