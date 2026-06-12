# packages/ui — @polso/ui

27 Shadcn/ui components + `use-mobile` hook. Raw `.tsx` exports — no build step. Style: `radix-lyra`, zinc base.

## Components

accordion, alert-dialog, avatar, badge, button, calendar, card, chart, checkbox, date-range-picker, dialog, dropdown-menu, input, label, popover, progress, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, switch, table, textarea, tooltip, use-mobile (hook)

## Import pattern

Each component is a separate subpath export:

```typescript
import { Button } from "@polso/ui/button"
import { Sheet, SheetContent, SheetHeader } from "@polso/ui/sheet"
import { useIsMobile } from "@polso/ui/use-mobile"
```

No barrel `@polso/ui` export — always use the component subpath.

## Adding a new component

1. `pnpm dlx shadcn@latest add <component-name>` — installs to `apps/web/components/ui/`
2. Move the file to `packages/ui/src/components/<name>.tsx`
3. Change `import { cn } from "@/lib/utils"` → `import { cn } from "@polso/utils/cn"`
4. Add the subpath export in `packages/ui/package.json` exports map
5. Add to `transpilePackages` in `apps/web/next.config.ts` if the component is new (already covered by wildcard rule — but double-check)

## Internal imports

Components reference each other with relative paths, NOT `@polso/ui/<name>`:

```typescript
// Inside packages/ui/src/components/sheet.tsx
import { cn } from "@polso/utils/cn"  // OK — workspace dep
// Do NOT: import { cn } from "@polso/ui/utils"
```

## Tailwind scanning — critical

`apps/web/app/globals.css` must include:

```css
@source "../node_modules/@polso/ui/src/**/*.{ts,tsx}";
```

This path uses the pnpm symlink in `node_modules/` so Turbopack can scan component files for utility class names. Without it, sidebar, sheet, and select styles are stripped from the CSS output.

**Do not change this path** — the relative path `../../packages/ui/src/` does NOT work with Turbopack's CSS pipeline.

## React as peerDependency

`react`, `react-dom`, and `sonner` are listed in `peerDependencies`, NOT `dependencies`. This ensures all packages share the same React instance from `apps/web`. Do not add `react` to `dependencies`.

## Runtime dependencies

`radix-ui`, `class-variance-authority`, `date-fns`, `react-day-picker`, `recharts`, `next-themes`, `@phosphor-icons/react`, `@polso/utils` (peer: `sonner`)
