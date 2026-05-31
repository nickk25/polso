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
      <Table className="table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-24" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>{t("table.name")}</TableHead>
            <TableHead>{t("table.type")}</TableHead>
            <TableHead>{t("table.entries")}</TableHead>
            <TableHead>{t("table.visible")}</TableHead>
            <TableHead />
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
