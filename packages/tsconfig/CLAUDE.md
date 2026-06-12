# packages/tsconfig — @polso/tsconfig

Shared TypeScript configuration. No runtime code — only `tsconfig.json` base files.

## Exports

| File | Used by |
|------|---------|
| `base.json` | Root base (strict, noEmit, bundler resolution) — extended directly by node-only packages (`agent`, `inbox`) |
| `library.json` | Extends `base.json`, adds `lib: ["ES2022", "DOM"]` — most shared packages |
| `next.json` | Extends `base.json` with Next.js settings — apps (`apps/web`, `apps/partner`) plus JSX packages (`ui`, `email`) |

## Usage

In most packages' `tsconfig.json`:
```json
{ "extends": "@polso/tsconfig/library.json" }
```

In Next.js apps (and JSX packages):
```json
{ "extends": "@polso/tsconfig/next.json" }
```

## Rules

- Do not add app-specific settings here — those belong in the app's own `tsconfig.json`
- All packages must extend one of these bases — never write a standalone tsconfig from scratch
