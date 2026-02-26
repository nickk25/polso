---
description: Improve code structure and readability without changing behavior.
---
# Refactor

Improve existing code to align with project patterns, improve readability, or reduce duplication — without changing behavior.

## Instructions

### Phase 1: Understand Current State

1. **Read the target code** — the file(s) the user wants refactored
2. **Read the canonical reference** for that file type:
   - Server action → read `features/expenses/actions/update-expense.ts`
   - Query → read `features/expenses/queries/get-expenses.ts`
   - Table component → read `features/expenses/components/expense-table.tsx`
   - Filter component → read `features/expenses/components/expense-filters.tsx`
   - Page → read `app/(dashboard)/expenses/page.tsx`
3. **Read `docs/CODE_PATTERNS.md`** for the full pattern templates
4. **Diff mentally** — identify every deviation between the target code and the canonical pattern

### Phase 2: Plan

5. **Enter plan mode** and present a categorized list of changes:

   **Structural** (file organization, naming):
   - File in wrong location?
   - Wrong naming convention?
   - Missing `"use server"` or `"use client"` directive?

   **Pattern compliance** (matching established conventions):
   - Missing `getAuthContext()` / `organizationId` filter?
   - Wrong return type (`ActionResponse<T>`)?
   - Missing `revalidatePath()`?
   - Hardcoded strings instead of i18n?
   - Custom HTML instead of Shadcn/ui components?
   - Default exports instead of named exports?

   **Code quality** (readability, DRY, types):
   - `any` types that should be specific?
   - Duplicated logic that should be extracted?
   - Missing TypeScript interfaces?
   - Overly complex logic that can be simplified?

   **Performance** (only if obvious):
   - Sequential queries that should use `Promise.all()`?
   - Missing `select` in Prisma includes (fetching all fields)?
   - Missing debounce on search inputs?

6. **Wait for user approval** — do NOT start refactoring without confirmation

### Phase 3: Execute

7. **Apply changes in this order** (each builds on the previous):
   1. Structural fixes (move files, fix naming)
   2. Pattern compliance (auth, return types, revalidation)
   3. Code quality (types, DRY, simplification)
   4. Performance (parallel queries, selects)

8. **One file at a time** — complete each file before moving to the next

9. **Preserve behavior** — the refactored code must produce identical results:
   - Same API responses
   - Same UI rendering
   - Same database queries (unless optimizing)

### Phase 4: Verify

10. **Run `pnpm build`** — must pass with zero errors
11. **Use preview tools** to verify UI looks identical (if components were changed)
12. **Report the changes:**
    - Files modified (with brief description of what changed in each)
    - Pattern violations fixed
    - Any remaining issues that were intentionally left (and why)

### Important Rules
- **Never change behavior during a refactor** — if a bug is found, note it and fix it separately
- **Never add features during a refactor** — scope creep defeats the purpose
- **If unsure about a pattern**, read the canonical implementation first rather than guessing
- **Small batches** — if more than 5 files need changes, break into multiple refactor passes
