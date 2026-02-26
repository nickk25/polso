---
description: Scaffold a complete feature module with all standard files following project patterns.
---
# Create Feature Module

Scaffold an entire feature module with all standard files following the project's established patterns.

## Input

The user will describe the new feature entity and its purpose. Example: "create a vendors feature" or "scaffold a budgets module"

## Instructions

### Phase 1: Plan

1. **Enter plan mode** to confirm scope with the user before generating any files
2. Read `docs/CODE_PATTERNS.md` for all template patterns
3. Read an existing feature module as reference — use `features/expenses/` as the canonical example
4. Present the plan: list all files that will be created, their purpose, and key fields/types
5. Wait for user approval before proceeding

### Phase 2: Generate Files

Create files in this order (each step depends on the previous):

#### Step 1: Query file
- `features/<entity>/queries/get-<entities>.ts`
- Define `EntityWithRelations`, `EntityFilters`, `EntityStats` interfaces
- Implement `get<Entities>()` with pagination, filtering, relations
- Implement `get<Entity>Stats()` with aggregates
- Always filter by `organizationId`

#### Step 2: Action files
- `features/<entity>/actions/create-<entity>.ts`
- `features/<entity>/actions/update-<entity>.ts`
- `features/<entity>/actions/delete-<entity>.ts` (if applicable)
- Each follows the server action pattern: `"use server"`, `getAuthContext()`, `ActionResponse<T>`, `revalidatePath()`
- Include bulk actions in the update file if the entity supports table selection

#### Step 3: Components
- `features/<entity>/components/<entity>-table.tsx` — Table with Sheet edit, checkbox selection
- `features/<entity>/components/<entity>-filters.tsx` — URL-based filters with debounced search
- `features/<entity>/components/<entity>-bulk-action-bar.tsx` — Bulk operations bar (if applicable)
- `features/<entity>/components/<entity>-pagination.tsx` — Page navigation
- All components use `"use client"`, `useTranslations`, Shadcn/ui, Phosphor icons

#### Step 4: Page
- `app/(dashboard)/<entities>/page.tsx` — Server component
- `Promise.all()` for parallel data fetching
- Standard layout: title → stats grid → filters → Card with table → pagination

#### Step 5: i18n
- `messages/en/<entities>.json` — All translation keys
- `messages/es/<entities>.json` — Spanish translations
- Follow the nested key structure: `title`, `description`, `table.*`, `tableFilters.*`, `bulk.*`, `pagination.*`, `fields.*`

#### Step 6: Routing
- Add the route to the sidebar navigation in the appropriate layout file
- Add the route to the proxy middleware if auth protection is needed

### Phase 3: Verify

1. Run `pnpm build` to check for type errors
2. Fix any issues found
3. Report the complete list of files created

### Important Notes
- The Prisma schema model must already exist before running this command. If it doesn't, tell the user to create the schema first with `pnpm prisma migrate dev`
- Always check if the feature directory already exists to avoid overwriting existing files
- Match the exact conventions from the expenses feature — when in doubt, read the expenses implementation
