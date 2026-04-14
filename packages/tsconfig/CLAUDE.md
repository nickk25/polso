# packages/tsconfig — @polso/tsconfig

Shared TypeScript configuration. No runtime code — only `tsconfig.json` base files.

## Exports

| File | Used by |
|------|---------|
| `base.json` | All packages (`packages/*/tsconfig.json`) |
| `next.json` | Next.js apps (`apps/web`, `apps/partner`) |
| `library.json` | Shared packages that need stricter settings |

## Usage

In any package's `tsconfig.json`:
```json
{ "extends": "@polso/tsconfig/base.json" }
```

In Next.js apps:
```json
{ "extends": "@polso/tsconfig/next.json" }
```

## Rules

- Do not add app-specific settings here — those belong in the app's own `tsconfig.json`
- All packages must extend one of these bases — never write a standalone tsconfig from scratch
