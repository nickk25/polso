# Code Patterns

Canonical code templates for the Polso codebase. Every slash command (`/ship`, `/review`, `/debug`, `/refactor`, `/create-feature`) references this file as the pattern authority.

The canonical reference implementation is **`apps/web/features/expenses/`** — when in doubt, read it.

---

## Import Path Reference

| What | Import from | Notes |
|------|-------------|-------|
| Prisma client | `@/lib/db` | Shim → `@polso/db` |
| Auth context | `@polso/auth/get-session` | Shared via @polso/auth |
| ActionResponse, successResponse, errorResponse | `@/lib/types` | Shim → `@polso/utils` |
| `cn()` | `@/lib/utils` | Shim → `@polso/utils/cn` |
| UI components | `@polso/ui/<component>` | Direct package import |
| Icons (client components) | `@phosphor-icons/react` | |
| Icons (server components) | `@phosphor-icons/react/dist/ssr` | SSR-safe variant |
| Prisma model types | `@polso/db` | For cross-package type sharing |
| Plan limits/pricing | `@polso/plans` | `getLimit`, `isWithinLimit` |
| R2 storage | `@polso/storage` | Or via `@/lib/storage/r2` shim |
| Email sending | `@polso/email/send` | Or via `@/lib/email/send` shim |

> **Shims**: `@/lib/db`, `@/lib/types`, `@/lib/utils`, `@/lib/plans`, `@/lib/storage`, `@/lib/email`, `@/lib/creem` all re-export from `@polso/*` packages. Both paths work; prefer `@polso/*` in new code outside `apps/web`.

---

## 1. Server Action

**File:** `apps/web/features/<module>/actions/<verb>-<entity>.ts`

```typescript
"use server"  // Must be the very first line

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

// Define input/result interfaces locally — never in shared types
interface UpdateWidgetInput {
  name?: string
  categoryId?: string | null
  status?: "active" | "archived"
}

// Function naming: verbEntityAction()
export async function updateWidgetAction(
  widgetId: string,
  input: UpdateWidgetInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Always first: get org context for multi-tenant scoping
    const { organizationId } = await getAuthContext()

    // Always verify ownership before any mutation
    const widget = await prisma.widget.findFirst({
      where: { id: widgetId, organizationId },
    })

    if (!widget) {
      return errorResponse("Widget not found", "NOT_FOUND")
    }

    // Validate related entities if needed
    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })
      if (!category) return errorResponse("Category not found", "NOT_FOUND")
    }

    const updated = await prisma.widget.update({
      where: { id: widgetId },
      data: { ...input },
    })

    // Always revalidate the feature route + dashboard
    revalidatePath("/widgets")
    revalidatePath("/dashboard")

    return successResponse({ id: updated.id })
  } catch (error) {
    console.error("Error updating widget:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update widget",
      "ERROR"  // Error codes: VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | DUPLICATE_ERROR | ERROR
    )
  }
}
```

---

## 2. Bulk Action

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

// Naming: bulkUpdateEntityFieldAction
export async function bulkUpdateWidgetStatusAction(
  widgetIds: string[],                      // Always string[]
  status: "active" | "archived"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    // updateMany with { in: ids } + organizationId for safety
    const result = await prisma.widget.updateMany({
      where: {
        id: { in: widgetIds },
        organizationId,                     // Always scope to org — updateMany has no ownership check otherwise
      },
      data: { status },
    })

    revalidatePath("/widgets")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating widgets:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update widgets",
      "ERROR"
    )
  }
}
```

---

## 3. Query

**File:** `apps/web/features/<module>/queries/get-<entity>.ts`

```typescript
// No "use server" — queries are plain async functions, not server actions
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

// Export typed interfaces — consumers import these for prop types
export interface WidgetFilters {
  search?: string
  status?: string
  categoryId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface WidgetWithRelations {
  id: string
  name: string
  status: string
  createdAt: Date
  category: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    items: number
  }
}

export async function getWidgets(
  filters: WidgetFilters = {},
  page = 1,
  pageSize = 25
): Promise<{ widgets: WidgetWithRelations[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  // Build where clause dynamically from filters
  const where: Record<string, unknown> = { organizationId }  // Always first

  if (filters.status) where.status = filters.status
  if (filters.categoryId === "none") {
    where.categoryId = null
  } else if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom && { gte: filters.dateFrom }),
      ...(filters.dateTo && { lte: filters.dateTo }),
    }
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  // Always parallel: data + count
  const [widgets, total] = await Promise.all([
    prisma.widget.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true },  // Always explicit select — never include all fields
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.widget.count({ where }),
  ])

  return {
    widgets: widgets as WidgetWithRelations[],
    total,
    pages: Math.ceil(total / pageSize),
  }
}
```

---

## 4. Stats Query

```typescript
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

export interface WidgetStats {
  totalThisMonth: number
  totalLastMonth: number
  activeCount: number
  monthOverMonthChange: number
}

export async function getWidgetStats(): Promise<WidgetStats> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Parallel aggregates — one Promise.all, not sequential awaits
  const [thisMonth, lastMonth, activeCount] = await Promise.all([
    prisma.widget.aggregate({
      where: { organizationId, createdAt: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { value: true },
    }),
    prisma.widget.aggregate({
      where: { organizationId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { value: true },
    }),
    prisma.widget.count({
      where: { organizationId, status: "active" },
    }),
  ])

  const totalThisMonth = thisMonth._sum.value ?? 0
  const totalLastMonth = lastMonth._sum.value ?? 0
  const monthOverMonthChange =
    totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0

  return { totalThisMonth, totalLastMonth, activeCount, monthOverMonthChange }
}
```

---

## 5. Page (Server Component)

**File:** `apps/web/app/(dashboard)/<route>/page.tsx`

```typescript
// No "use client" — pages are server components
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Widget } from "@phosphor-icons/react/dist/ssr"  // SSR icon import
import { getWidgets, getWidgetStats } from "@/features/widgets/queries/get-widgets"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { WidgetFilters } from "@/features/widgets/components/widget-filters"
import { WidgetTable } from "@/features/widgets/components/widget-table"
import { WidgetPagination } from "@/features/widgets/components/widget-pagination"

const PAGE_SIZE = 25

// searchParams is Promise in Next.js 15+
interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    category?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WidgetsPage({ searchParams }: PageProps) {
  const t = await getTranslations("widgets")
  const params = await searchParams

  const page = parseInt(params.page || "1", 10)

  // Parallel data fetching — never sequential awaits at the top level
  const [{ widgets, total, pages }, stats, categories] = await Promise.all([
    getWidgets(
      {
        search: params.search,
        status: params.status,
        categoryId: params.category,
        dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
        dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      },
      page,
      PAGE_SIZE
    ),
    getWidgetStats(),
    getActiveCategories(),
  ])

  const hasData = widgets.length > 0
  const hasAnyData = total > 0 || stats.totalThisMonth > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {total > 0 ? t("count", { count: total }) : t("subtitle")}
        </p>
      </div>

      {/* Stats grid — only when there's data */}
      {hasAnyData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("thisMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalThisMonth}</div>
            </CardContent>
          </Card>
          {/* ... more stat cards */}
        </div>
      )}

      {/* Filters — only when there's data */}
      {hasAnyData && (
        <WidgetFilters
          search={params.search}
          status={params.status}
          category={params.category}
          categories={categories}
        />
      )}

      {/* Three empty states: has matching data, has data but filtered out, no data at all */}
      {hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("list")}</CardTitle>
          </CardHeader>
          <CardContent>
            <WidgetTable widgets={widgets} categories={categories} />
            <WidgetPagination currentPage={page} totalPages={pages} total={total} />
          </CardContent>
        </Card>
      ) : hasAnyData ? (
        // Has data, but current filters return nothing
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Widget className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noMatchingWidgets")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("tryAdjustingFilters")}
            </p>
          </CardContent>
        </Card>
      ) : (
        // No data at all — onboarding empty state
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Widget className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noWidgetsYet")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("noWidgetsDescription")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 6. Table Component

**File:** `apps/web/features/<module>/components/<entity>-table.tsx`

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@polso/ui/table"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@polso/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@polso/ui/select"
import { Label } from "@polso/ui/label"
import { Spinner } from "@phosphor-icons/react"        // Client component — no /dist/ssr
import { updateWidgetAction } from "../actions/update-widget"
import type { WidgetWithRelations } from "../queries/get-widgets"

interface WidgetTableProps {
  widgets: WidgetWithRelations[]
  categories: { id: string; name: string; color: string }[]
}

export function WidgetTable({ widgets, categories }: WidgetTableProps) {
  const router = useRouter()
  const t = useTranslations("widgets")
  const tc = useTranslations("common")

  // Detail sheet state
  const [selectedWidget, setSelectedWidget] = useState<WidgetWithRelations | null>(null)
  const [loading, setLoading] = useState(false)

  // Inline edits tracked separately from the selected entity
  const [editedStatus, setEditedStatus] = useState<string>("")
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleRowClick = (widget: WidgetWithRelations) => {
    setSelectedWidget(widget)
    setEditedStatus(widget.status)
    setEditedCategoryId(widget.category?.id ?? null)
  }

  // Only enable Save when something actually changed
  const hasChanges =
    selectedWidget &&
    (editedStatus !== selectedWidget.status ||
      editedCategoryId !== (selectedWidget.category?.id ?? null))

  const handleSave = async () => {
    if (!selectedWidget) return
    setLoading(true)
    await updateWidgetAction(selectedWidget.id, {
      status: editedStatus as "active" | "archived",
      categoryId: editedCategoryId,
    })
    setLoading(false)
    setSelectedWidget(null)
    router.refresh()  // Refresh server data without full navigation
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === widgets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(widgets.map((w) => w.id)))
    }
  }

  return (
    <>
      {/* Bulk action bar — rendered above table when items are selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-2">
          <span className="text-sm">{tc("selected", { count: selectedIds.size })}</span>
          {/* bulk action buttons */}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selectedIds.size === widgets.length && widgets.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>{t("table.name")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {widgets.map((widget) => (
            <TableRow
              key={widget.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(widget)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(widget.id)}
                  onCheckedChange={() => toggleSelect(widget.id)}
                />
              </TableCell>
              <TableCell>{widget.name}</TableCell>
              <TableCell>
                {widget.category ? (
                  <Badge variant="outline">{widget.category.name}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={widget.status === "active" ? "default" : "secondary"}>
                  {widget.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sheet edit panel */}
      <Sheet open={!!selectedWidget} onOpenChange={(open) => !open && setSelectedWidget(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("editSheet.title")}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* Each form field: div > Label + Control */}
            <div className="space-y-2">
              <Label>{t("fields.status")}</Label>
              <Select value={editedStatus} onValueChange={setEditedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("status.active")}</SelectItem>
                  <SelectItem value="archived">{t("status.archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer always at bottom: Cancel (outline) + Save (default) */}
          <SheetFooter className="mt-auto p-0">
            <Button variant="outline" onClick={() => setSelectedWidget(null)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || loading}>
              {loading && <Spinner className="h-4 w-4 animate-spin mr-2" />}
              {tc("save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

---

## 7. Filter Component

**File:** `apps/web/features/<module>/components/<entity>-filters.tsx`

```typescript
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@polso/ui/input"
import { Button } from "@polso/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@polso/ui/select"
import { MagnifyingGlass, X } from "@phosphor-icons/react"

interface WidgetFiltersProps {
  // Props come from the server parent (searchParams values)
  search?: string
  status?: string
  category?: string
  categories: { id: string; name: string }[]
}

export function WidgetFilters({ search, status, category, categories }: WidgetFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("widgets")

  // Helper: builds updated URLSearchParams and navigates
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        // null, "", or "all" → delete the param (reset to unfiltered)
        if (!value || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      params.delete("page")  // Always reset to page 1 when filters change

      startTransition(() => {
        router.push(`/widgets?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  // Local state for debounced search input
  const [searchValue, setSearchValue] = useState(search || "")

  // Sync back when URL changes (browser back/forward)
  useEffect(() => { setSearchValue(search || "") }, [search])

  // Debounce: only update URL after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search || "")) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const hasFilters = search || status || category

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("tableFilters.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 w-[200px]"
        />
      </div>

      {/* Category filter — "all" is the sentinel for "no filter" */}
      <Select
        value={category || "all"}
        onValueChange={(value) => updateParams({ category: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("tableFilters.allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("tableFilters.allCategories")}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={status || "all"}
        onValueChange={(value) => updateParams({ status: value })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("tableFilters.allStatus")}</SelectItem>
          <SelectItem value="active">{t("tableFilters.active")}</SelectItem>
          <SelectItem value="archived">{t("tableFilters.archived")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear button — only when filters are active */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.push("/widgets"))}
          disabled={isPending}
        >
          <X className="h-4 w-4 mr-1" />
          {t("tableFilters.clear")}
        </Button>
      )}
    </div>
  )
}
```

---

## 8. i18n

**Files:** `apps/web/messages/en/<namespace>.json` + `apps/web/messages/es/<namespace>.json`

```json
// apps/web/messages/en/widgets.json
{
  "title": "Widgets",
  "subtitle": "Manage your widgets",
  "count": "{count} {count, plural, one {widget} other {widgets}}",
  "thisMonth": "This Month",

  "fields": {
    "name": "Name",
    "status": "Status",
    "category": "Category",
    "createdAt": "Created"
  },

  "status": {
    "active": "Active",
    "archived": "Archived"
  },

  "table": {
    "name": "Name",
    "category": "Category",
    "status": "Status",
    "unknown": "Unknown"
  },

  "tableFilters": {
    "searchPlaceholder": "Search widgets...",
    "allCategories": "All Categories",
    "allStatus": "All Status",
    "active": "Active",
    "archived": "Archived",
    "clear": "Clear"
  },

  "bulk": {
    "selected": "{count} selected",
    "updateStatus": "Update Status",
    "archive": "Archive"
  },

  "pagination": {
    "showing": "Showing {start}–{end} of {total}",
    "previous": "Previous",
    "next": "Next"
  },

  "editSheet": {
    "title": "Edit Widget"
  },

  "noMatchingWidgets": "No matching widgets",
  "tryAdjustingFilters": "Try adjusting your search or filters",
  "noWidgetsYet": "No widgets yet",
  "noWidgetsDescription": "Create your first widget to get started."
}
```

**Registration** — add to `apps/web/lib/i18n/messages.ts`:

```typescript
// Add import at top (both en and es)
import enWidgets from "@/messages/en/widgets.json"
import esWidgets from "@/messages/es/widgets.json"

// Add to messages object (both en and es)
const messages = {
  en: {
    // ... existing namespaces ...
    widgets: enWidgets,
  },
  es: {
    // ... existing namespaces ...
    widgets: esWidgets,
  },
} as const
```

**Usage:**
- Server components: `const t = await getTranslations("widgets")` from `next-intl/server`
- Client components: `const t = useTranslations("widgets")` from `next-intl`
- ICU plural: `t("count", { count: 5 })` → `"5 widgets"`
