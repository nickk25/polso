# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polso is a Next.js 16 application using React 19, TypeScript, Tailwind CSS v4, and Shadcn/ui component library.

## UI Components - IMPORTANT

**Always use Shadcn/ui components for all UI development.** Do not create custom components when a Shadcn component exists.

- Use the **shadcn MCP server** to discover available components and get usage examples
- When unsure about a component, query the MCP first before implementing
- Install components via CLI: `pnpm dlx shadcn@latest add <component-name>`
- Components use Radix UI primitives, Phosphor icons, and the `radix-lyra` style

## Commands

```bash
pnpm dev      # Start development server (localhost:3000)
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Architecture

- **App Router**: All routes in `/app` directory, uses React Server Components by default
- **Path Aliases**: Use `@/` for imports (maps to project root)
  - `@/components` - React components
  - `@/components/ui` - Shadcn UI components
  - `@/lib/utils` - Utility functions (cn helper for class merging)
  - `@/hooks` - Custom React hooks
- **Styling**: Tailwind CSS with CSS custom properties for theming (oklch color space, light/dark mode)
- **Fonts**: JetBrains Mono (primary), Geist Sans and Geist Mono via next/font

## Configuration

- **components.json**: Shadcn/ui config with `radix-lyra` style, zinc base color
- **ESLint**: Flat config format (v9) with Next.js core-web-vitals rules
- **TypeScript**: Strict mode enabled, bundler module resolution
