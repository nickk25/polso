# features/categories

Transaction category CRUD with per-org visibility preferences. Serves `/categories`.

## Files

- `actions/manage-category.ts` — `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`, `toggleCategoryVisibilityAction`; slug generation with uniqueness loop, hex color + 3–12 digit account code validation
- `queries/get-categories.ts` — `getSystemCategories`, `getCustomCategories`, `getAllCategories`, `getActiveCategories` (excludes hidden), `getCategoryById`; all return `CategoryWithCount` with `isHidden` merged from CategoryPreference
- `lib/constants.ts` — `NONE_VALUE`, `HEX_COLOR_RE`, `ENTRY_TYPE_BADGE_VARIANT`
- `components/` — `CategoriesPageContent` (custom + system sections), `CategoryTable` → `CategoryCard` rows (visibility switch, delete dialog), `CategoryForm` (Sheet, preset colors, entryType fixed/variable, account code), `CategorySelect` (grouped select reused by other features)

## Key flows

- System categories (`isSystem: true`) are global; orgs can only hide them — visibility is a per-org `CategoryPreference` upsert, not an edit
- Only non-system categories owned by the org can be edited/deleted; delete is blocked with code `HAS_LINKED_ITEMS` if entries are linked
- Renaming regenerates the slug (unique per org, `-1`, `-2` suffixes)
- All mutations revalidate `/categories` + `/transactions`

## Data & integration

- Models: Category, CategoryPreference, Entry (counts only)
- i18n namespace: `categories` (+ `common` for actions)
- Used by / uses: `app/(dashboard)/categories/page.tsx`; `CategorySelect` + queries reused by `features/transactions` (table, filters, bulk bar), `features/counterparties` (form), and `features/agent` (`list-categories` tool)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
