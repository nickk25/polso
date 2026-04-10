# packages/utils — @polso/utils

Shared utilities used across all `@polso/*` packages and `apps/web`. Leaf package — no workspace deps.

## What it exports

```typescript
// Barrel (import from "@polso/utils")
cn()                 // Tailwind class merge — clsx + tailwind-merge
ActionResponse<T>    // type — { success: true, data: T } | { success: false, error: string, code: string }
successResponse()    // constructs ActionResponse success
errorResponse()      // constructs ActionResponse error

// Domain enums (re-exported types, not runtime values)
UserRole, ExpenseType, ExpenseStatus, IncomeSource, IncomeStatus,
AccountStatus, RecurringFrequency, AlertType, AlertSeverity, ExportStatus,
DashboardKPIs
```

## Subpath exports

| Import | File |
|--------|------|
| `@polso/utils` | barrel — all of the above |
| `@polso/utils/cn` | `cn()` only |
| `@polso/utils/action-response` | `ActionResponse`, `successResponse`, `errorResponse` |
| `@polso/utils/types` | enums only |

## ActionResponse pattern

Every server action returns `Promise<ActionResponse<T>>`:

```typescript
import { successResponse, errorResponse } from "@polso/utils"

try {
  const result = await prisma.expense.create(...)
  return successResponse(result)
} catch {
  return errorResponse("Failed to create expense", "ERROR")
}
```

Error codes in use: `VALIDATION_ERROR` | `NOT_FOUND` | `FORBIDDEN` | `DUPLICATE_ERROR` | `ERROR`

## Rule

Only add things here that are **truly shared across multiple packages**. App-specific types, feature enums, or anything only used in `apps/web` stays in the app.
