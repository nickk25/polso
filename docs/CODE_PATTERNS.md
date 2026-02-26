# Code Patterns Reference

This document contains the canonical code patterns for the Polso codebase. Read this before generating any new code. Every template below is derived from real production code.

---

## 1. Server Action

**Location:** `features/<module>/actions/<verb>-<entity>.ts`

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

// Define input/result interfaces locally — never in shared types
interface UpdateEntityInput {
  fieldA?: string | null
  fieldB?: "option1" | "option2"
  status?: "pending" | "active" | "excluded"
}

export async function updateEntityAction(
  entityId: string,
  input: UpdateEntityInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    // 1. Auth — always first
    const { organizationId } = await getAuthContext()

    // 2. Ownership guard — verify entity belongs to org
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, organizationId },
    })

    if (!entity) {
      return errorResponse("Entity not found", "NOT_FOUND")
    }

    // 3. Validate related records if needed
    if (input.fieldA) {
      const related = await prisma.related.findFirst({
        where: {
          id: input.fieldA,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })
      if (!related) {
        return errorResponse("Related record not found", "NOT_FOUND")
      }
    }

    // 4. Perform mutation
    const updated = await prisma.entity.update({
      where: { id: entityId },
      data: {
        fieldA: input.fieldA !== undefined ? input.fieldA : undefined,
        fieldB: input.fieldB,
        status: input.status,
      },
    })

    // 5. Revalidate — feature route + dashboard
    revalidatePath("/entities")
    revalidatePath("/dashboard")

    return successResponse({ id: updated.id })
  } catch (error) {
    console.error("Error updating entity:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entity",
      "ERROR"
    )
  }
}

// Bulk action pattern
export async function bulkUpdateEntityFieldAction(
  entityIds: string[],
  value: string | null
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.entity.updateMany({
      where: {
        id: { in: entityIds },
        organizationId,
      },
      data: { field: value },
    })

    revalidatePath("/entities")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating entities:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entities",
      "ERROR"
    )
  }
}
```

**Error codes:** `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `DUPLICATE_ERROR`, `LIMIT_EXCEEDED`, `HAS_LINKED_ITEMS`, `ERROR`

**Naming:** `verbEntityAction` — e.g., `updateExpenseAction`, `createCategoryAction`, `deleteCategoryAction`

**Bulk naming:** `bulkUpdateEntityFieldAction` — e.g., `bulkUpdateExpenseCategoryAction`

---

## 2. Query

**Location:** `features/<module>/queries/get-<entities>.ts`

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

// Typed interfaces — defined here, exported for components
export interface EntityFilters {
  search?: string
  status?: string
  categoryId?: string
}

export interface EntityWithRelations {
  id: string
  amount: number
  currency: string
  date: Date
  description: string | null
  status: string
  category: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    relatedItems: number
  }
}

export async function getEntities(
  filters: EntityFilters = {},
  page = 1,
  pageSize = 50
): Promise<{ entities: EntityWithRelations[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  // Build where dynamically
  const where: Record<string, unknown> = { organizationId }

  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.status) where.status = filters.status

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { relation: { name: { contains: filters.search, mode: "insensitive" } } },
    ]
  }

  // Parallel fetch: data + count
  const [entities, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { relatedItems: true },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.entity.count({ where }),
  ])

  return {
    entities: entities as EntityWithRelations[],
    total,
    pages: Math.ceil(total / pageSize),
  }
}

// Stats query pattern
export interface EntityStats {
  totalThisMonth: number
  totalLastMonth: number
  count: number
  monthOverMonthChange: number
}

export async function getEntityStats(): Promise<EntityStats> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [thisMonth, lastMonth, count] = await Promise.all([
    prisma.entity.aggregate({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.entity.aggregate({
      where: {
        organizationId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.entity.count({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
    }),
  ])

  const totalThisMonth = thisMonth._sum.amount || 0
  const totalLastMonth = lastMonth._sum.amount || 0
  const monthOverMonthChange =
    totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0

  return { totalThisMonth, totalLastMonth, count, monthOverMonthChange }
}
```

**Key rules:**
- Always `include` with explicit `select` — never include all fields
- `organizationId` is always the first where condition
- Use `Promise.all()` for parallel queries
- Cast result `as EntityWithRelations[]` when Prisma types don't match interface exactly
- Named exports only

---

## 3. Table Component with Sheet Edit

**Location:** `features/<module>/components/<entity>-table.tsx`

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@phosphor-icons/react"
import { CategorySelect } from "@/features/categories/components/category-select"
import { EntityBulkActionBar } from "./entity-bulk-action-bar"
import { updateEntityAction } from "../actions/update-entity"
import type { EntityWithRelations } from "../queries/get-entities"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface EntityTableProps {
  entities: EntityWithRelations[]
  categories: CategoryWithCount[]
}

export function EntityTable({ entities, categories }: EntityTableProps) {
  const router = useRouter()
  const t = useTranslations("entities")
  const tc = useTranslations("common")

  // Edit sheet state
  const [selectedEntity, setSelectedEntity] = useState<EntityWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [editedStatus, setEditedStatus] = useState<string>("")

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entities.map((e) => e.id)))
    }
  }

  const allSelected = entities.length > 0 && selectedIds.size === entities.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < entities.length

  const handleRowClick = (entity: EntityWithRelations) => {
    setSelectedEntity(entity)
    setEditedCategoryId(entity.category?.id || null)
    setEditedStatus(entity.status)
  }

  const handleSave = async () => {
    if (!selectedEntity) return
    setLoading(true)

    const result = await updateEntityAction(selectedEntity.id, {
      categoryId: editedCategoryId,
      status: editedStatus as "pending" | "active" | "excluded",
    })

    setLoading(false)
    if (result.success) {
      setSelectedEntity(null)
      router.refresh()
    }
  }

  const hasChanges =
    selectedEntity &&
    (editedCategoryId !== (selectedEntity.category?.id || null) ||
      editedStatus !== selectedEntity.status)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.description")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead className="text-right">{t("table.amount")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow
              key={entity.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(entity)}
              data-state={selectedIds.has(entity.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(entity.id)}
                  onCheckedChange={() => toggleSelect(entity.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select row"
                />
              </TableCell>
              <TableCell className="font-medium">
                {format(new Date(entity.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{entity.description || t("table.unknown")}</TableCell>
              <TableCell>
                {entity.category ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entity.category.color }}
                    />
                    <span>{entity.category.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: entity.currency,
                }).format(entity.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={entity.status === "active" ? "default" : "outline"}>
                  {t(`statuses.${entity.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <EntityBulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          categories={categories}
        />
      )}

      {/* Edit Sheet */}
      <Sheet open={!!selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("editSheet.title")}</SheetTitle>
            <SheetDescription>
              {selectedEntity?.description || t("table.unknown")}
            </SheetDescription>
          </SheetHeader>

          {selectedEntity && (
            <div className="flex flex-col flex-1 gap-6 p-4">
              <div className="space-y-2">
                <Label>{t("fields.category")}</Label>
                <CategorySelect
                  value={editedCategoryId}
                  onValueChange={setEditedCategoryId}
                  categories={categories}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.status")}</Label>
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
                    <SelectItem value="active">{t("statuses.active")}</SelectItem>
                    <SelectItem value="excluded">{t("statuses.excluded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SheetFooter className="mt-auto p-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedEntity(null)}
                  disabled={loading}
                >
                  {tc("actions.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={loading || !hasChanges}>
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      {tc("actions.saving")}
                    </>
                  ) : (
                    tc("actions.saveChanges")
                  )}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
```

---

## 4. Filter Component

**Location:** `features/<module>/components/<entity>-filters.tsx`

```typescript
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MagnifyingGlass, X } from "@phosphor-icons/react"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface EntityFiltersProps {
  search?: string
  status?: string
  category?: string
  categories: CategoryWithCount[]
}

export function EntityFilters({ search, status, category, categories }: EntityFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("entities")

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // Reset to page 1 when filters change
      params.delete("page")

      startTransition(() => {
        router.push(`/entities?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const [searchValue, setSearchValue] = useState(search || "")

  // Sync external prop changes (browser back/forward)
  useEffect(() => {
    setSearchValue(search || "")
  }, [search])

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search || "")) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const clearFilters = () => {
    startTransition(() => {
      router.push("/entities")
    })
  }

  const hasFilters = search || status || category

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("tableFilters.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={category || "all"}
          onValueChange={(value) => updateParams({ category: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("tableFilters.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tableFilters.allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || "all"}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("tableFilters.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tableFilters.allStatus")}</SelectItem>
            <SelectItem value="pending">{t("tableFilters.pending")}</SelectItem>
            <SelectItem value="active">{t("tableFilters.active")}</SelectItem>
            <SelectItem value="excluded">{t("tableFilters.excluded")}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            {t("tableFilters.clear")}
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## 5. Bulk Action Bar

**Location:** `features/<module>/components/<entity>-bulk-action-bar.tsx`

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner, X, Tag, CheckCircle } from "@phosphor-icons/react"
import { bulkUpdateEntityCategoryAction, bulkUpdateEntityStatusAction } from "../actions/update-entity"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface EntityBulkActionBarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
  categories: CategoryWithCount[]
}

export function EntityBulkActionBar({
  selectedIds,
  onClearSelection,
  categories,
}: EntityBulkActionBarProps) {
  const router = useRouter()
  const t = useTranslations("entities")
  const [loading, setLoading] = useState(false)

  const ids = Array.from(selectedIds)
  const count = ids.length

  const handleCategoryChange = async (categoryId: string | null) => {
    setLoading(true)
    const result = await bulkUpdateEntityCategoryAction(ids, categoryId)
    setLoading(false)
    if (result.success) router.refresh()
  }

  const handleStatusChange = async (status: string) => {
    setLoading(true)
    const result = await bulkUpdateEntityStatusAction(ids, status)
    setLoading(false)
    if (result.success) router.refresh()
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
      {loading && <Spinner className="h-4 w-4 animate-spin" />}

      <span className="text-sm font-medium">
        {t("bulk.selected", { count })}
      </span>

      <div className="h-4 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <Tag className="h-4 w-4 mr-1" />
            {t("bulk.categorize")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
          {categories.map((cat) => (
            <DropdownMenuItem key={cat.id} onClick={() => handleCategoryChange(cat.id)}>
              <div className="h-2 w-2 shrink-0 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => handleCategoryChange(null)}>
            <span className="text-muted-foreground">— None</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-1" />
            {t("bulk.setStatus")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => handleStatusChange("pending")}>Pending</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("active")}>Active</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("excluded")}>Excluded</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border" />

      <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={loading}>
        <X className="h-4 w-4 mr-1" />
        {t("bulk.deselect")}
      </Button>
    </div>
  )
}
```

---

## 6. Pagination Component

**Location:** `features/<module>/components/<entity>-pagination.tsx`

```typescript
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"

interface EntityPaginationProps {
  currentPage: number
  totalPages: number
  total: number
}

export function EntityPagination({ currentPage, totalPages, total }: EntityPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("entities")

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete("page")
    else params.set("page", page.toString())
    startTransition(() => {
      router.push(`/entities?${params.toString()}`)
    })
  }

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * 25 + 1
  const endItem = Math.min(currentPage * 25, total)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {t("pagination.showing", { start: startItem, end: endItem, total })}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || isPending}>
          <CaretLeft className="h-4 w-4 mr-1" />
          {t("pagination.previous")}
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {t("pagination.page", { current: currentPage, total: totalPages })}
        </span>
        <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || isPending}>
          {t("pagination.next")}
          <CaretRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
```

---

## 7. Page (Server Component)

**Location:** `app/(dashboard)/<entities>/page.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconName, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getEntities, getEntityStats } from "@/features/entity/queries/get-entities"
import { getAllCategories } from "@/features/categories/queries/get-categories"
import { EntityFilters } from "@/features/entity/components/entity-filters"
import { EntityPagination } from "@/features/entity/components/entity-pagination"
import { EntityTable } from "@/features/entity/components/entity-table"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

const PAGE_SIZE = 25

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    category?: string
  }>
}

export default async function EntitiesPage({ searchParams }: PageProps) {
  const t = await getTranslations("entities")
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const search = params.search || undefined
  const status = params.status || undefined
  const category = params.category || undefined

  // Parallel data fetching
  const [{ entities, total, pages }, stats, categories] = await Promise.all([
    getEntities({ search, status, categoryId: category }, page, PAGE_SIZE),
    getEntityStats(),
    getAllCategories(),
  ])

  const hasEntities = entities.length > 0
  const hasAnyEntities = total > 0 || stats.totalThisMonth > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Grid */}
      {hasAnyEntities && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("thisMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalThisMonth)}</div>
            </CardContent>
          </Card>
          {/* ... more stat cards */}
        </div>
      )}

      {/* Filters */}
      {hasAnyEntities && (
        <div className="flex items-center justify-between gap-4">
          <EntityFilters search={search} status={status} category={category} categories={categories} />
        </div>
      )}

      {/* Table */}
      {hasEntities ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityTable entities={entities} categories={categories} />
            <EntityPagination currentPage={page} totalPages={pages} total={total} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <IconName className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 8. i18n JSON Structure

**Location:** `messages/{en,es}/<namespace>.json`

```json
{
  "title": "Entities",
  "subtitle": "Manage your entities",
  "thisMonth": "This Month",
  "lastMonth": "Last Month",
  "fields": {
    "description": "Description",
    "amount": "Amount",
    "date": "Date",
    "category": "Category",
    "status": "Status"
  },
  "statuses": {
    "pending": "Pending",
    "active": "Active",
    "excluded": "Excluded"
  },
  "table": {
    "date": "Date",
    "description": "Description",
    "category": "Category",
    "amount": "Amount",
    "status": "Status",
    "unknown": "Unknown"
  },
  "tableFilters": {
    "searchPlaceholder": "Search entities...",
    "statusPlaceholder": "Status",
    "allStatus": "All Status",
    "pending": "Pending",
    "active": "Active",
    "excluded": "Excluded",
    "categoryPlaceholder": "Category",
    "allCategories": "All Categories",
    "clear": "Clear"
  },
  "editSheet": {
    "title": "Edit Entity",
    "saveChanges": "Save Changes",
    "cancel": "Cancel",
    "saving": "Saving..."
  },
  "bulk": {
    "selected": "{count} selected",
    "categorize": "Categorize",
    "setStatus": "Set Status",
    "deselect": "Deselect all"
  },
  "pagination": {
    "showing": "Showing {start}-{end} of {total}",
    "previous": "Previous",
    "next": "Next",
    "page": "Page {current} of {total}"
  },
  "empty": {
    "title": "No entities yet",
    "description": "Get started by creating your first entity."
  }
}
```

**Rules:**
- One file per feature namespace
- Nested keys grouped by area: `table.*`, `fields.*`, `bulk.*`, `pagination.*`, `editSheet.*`, `tableFilters.*`
- Interpolation uses `{variableName}` syntax
- Plurals use ICU format: `"{count, plural, one {# item} other {# items}}"`
- Common translations (`cancel`, `save`, `saving`) live in `messages/{en,es}/common.json` under `actions.*`
