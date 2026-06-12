# packages/utils — @polso/utils

Shared utilities used across all `@polso/*` packages and both apps. Leaf package — no workspace deps.

## What it exports

```typescript
// Barrel (import from "@polso/utils")
cn()                 // Tailwind class merge — clsx + tailwind-merge
ActionResponse<T>    // type — { success: true, data: T } | { success: false, error: string, code?: string }
successResponse(data)        // constructs ActionResponse success
errorResponse(error, code?)  // constructs ActionResponse error

// Spanish tax helpers (barrel only — no subpath)
SPANISH_IVA_RATES            // [0.21, 0.10, 0.04, 0] as const
SpanishIvaRate               // type — union of those rates
calculateTaxFromGross(gross, rate)  // tax included in gross total (precio con IVA)

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
| `@polso/utils/export` | `generateInvoiceFileName()`, `escapeCsv()` — not in barrel |
| `@polso/utils/upload` | `UPLOAD_ACCEPTED_TYPES`, `UPLOAD_MAX_FILE_SIZE` (10 MB) — not in barrel |
| `@polso/utils/quarters` | `FiscalQuarter`, `getFiscalQuarters()`, `getCurrentQuarter()`, `getCurrentQuarterNumber()`, `getDaysToQuarterEnd()` — Spanish Modelo 303 quarters, not in barrel |

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

Common error codes in use: `NOT_FOUND` | `FORBIDDEN` | `VALIDATION_ERROR` | `ERROR` | `RATE_LIMITED` | `UNAUTHORIZED` | `DUPLICATE_ERROR` (the `code` param is optional and free-form)

## Rule

Only add things here that are **truly shared across multiple packages**. App-specific types, feature enums, or anything only used in `apps/web` stays in the app.
