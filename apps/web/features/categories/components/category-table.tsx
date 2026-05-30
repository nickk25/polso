"use client"

import { useTranslations } from "next-intl"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { CategoryCard } from "./category-card"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategoryTableProps {
  categories: CategoryWithCount[]
  onEdit?: (category: CategoryWithCount) => void
  emptyState?: React.ReactNode
}

export function CategoryTable({ categories, onEdit, emptyState }: CategoryTableProps) {
  const t = useTranslations("categories")

  return (
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
          {categories.length === 0 && emptyState
            ? emptyState
            : categories.map((category) => (
                <CategoryCard key={category.id} category={category} onEdit={onEdit} />
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
