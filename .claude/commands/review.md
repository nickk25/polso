# Code Review

Review code changes against this project's established patterns and conventions.

## Instructions

1. **Get the changes to review:**
   - If the user specified a file path, read that file
   - Otherwise, run `git diff --cached` to get staged changes; if empty, run `git diff` for unstaged changes; if still empty, run `git diff HEAD~1` for the last commit

2. **Read the project rules:** Read `docs/CODE_PATTERNS.md` for the full pattern reference

3. **Check each changed file against these rules:**

### Server Actions (`features/*/actions/*.ts`)
- [ ] Starts with `"use server"` directive
- [ ] First line in try: `const { organizationId } = await getAuthContext()`
- [ ] Returns `Promise<ActionResponse<T>>` using `successResponse()` / `errorResponse()`
- [ ] Uses proper error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `DUPLICATE_ERROR`, `ERROR`
- [ ] Calls `revalidatePath()` after mutations (feature route + `/dashboard`)
- [ ] Function named as `verbEntityAction()`
- [ ] Input/result interfaces defined locally in the file
- [ ] Verifies entity ownership with `organizationId` before mutations

### Queries (`features/*/queries/*.ts`)
- [ ] Exports typed interfaces (`EntityWithRelations`, `EntityFilters`)
- [ ] Filters by `organizationId` first in every query
- [ ] Uses `Promise.all()` for parallel data + count fetches
- [ ] Uses explicit `select` inside `include` — never includes all fields
- [ ] Named exports only (no default exports)

### Components (`features/*/components/*.tsx`)
- [ ] Has `"use client"` directive for interactive components
- [ ] Uses `useTranslations("namespace")` — no hardcoded user-facing strings
- [ ] Icons from `@phosphor-icons/react` (client) or `@phosphor-icons/react/dist/ssr` (server)
- [ ] Uses Shadcn/ui components (not custom HTML for buttons, inputs, selects, etc.)
- [ ] Named exports (no default exports)
- [ ] Form fields wrapped in `<div className="space-y-2"><Label /><Control /></div>`

### Pages (`app/(dashboard)/*/page.tsx`)
- [ ] Server component (no `"use client"`)
- [ ] Uses `await getTranslations()` for server-side i18n
- [ ] Parallel data fetching with `Promise.all([])`
- [ ] Follows layout: outer div → title → stats → filters → Card with table

### Naming
- [ ] File names: kebab-case (`expense-table.tsx`, `get-expenses.ts`)
- [ ] Component exports: PascalCase (`ExpenseTable`)
- [ ] Function exports: camelCase (`updateExpenseAction`)
- [ ] Routes: plural nouns (`/expenses`, `/incomes`)

### i18n
- [ ] All user-facing strings use translation keys (no hardcoded text)
- [ ] Keys added to both `messages/en/` and `messages/es/` files
- [ ] Proper nesting: `table.*`, `fields.*`, `bulk.*`, `pagination.*`
- [ ] **If a new `messages/en/<namespace>.json` was added:** verify `lib/i18n/messages.ts` has both the `import` and the key registered under `en:` and `es:`

### General
- [ ] No `any` types
- [ ] No unused imports or variables
- [ ] No hardcoded colors — uses Tailwind theme tokens
- [ ] No security issues (SQL injection, missing auth checks, exposed secrets)

4. **Report findings organized by severity:**
   - **Error**: Pattern violations that must be fixed (missing auth, wrong return types, hardcoded strings)
   - **Warning**: Deviations from convention that should be fixed (naming, missing revalidation)
   - **Info**: Minor suggestions for improvement

5. **For each finding, provide:**
   - File and line number
   - What's wrong
   - Code snippet showing the fix

Format the output as a clean checklist the developer can act on.
