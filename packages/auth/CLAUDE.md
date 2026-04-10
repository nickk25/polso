# packages/auth — @polso/auth

Shared Neon Auth wrapper used by both `apps/web` and `apps/partner`.

## What it exports

```typescript
// from "@polso/auth"
getAuthContext()          // → { userId, organizationId } — throws if not authenticated
getAuthContextWithType()  // → { userId, organizationId, orgType } — includes org type
getAuthContextOptional()  // → AuthContext | null — safe version
authClient                // Neon Auth browser client (use in "use client" components)
authServer                // Neon Auth server instance
AuthContext               // type — { userId, organizationId }
PartnerAuthContext        // type — extends AuthContext with orgType

// from "@polso/auth/client" (use in client components)
authClient

// from "@polso/auth/server"
authServer

// from "@polso/auth/get-session"
getAuthContext, getAuthContextWithType, getAuthContextOptional
```

## Auth provider

Uses `@neondatabase/auth` (Neon Auth, based on Better Auth). Auth state is managed by Neon — no custom server needed.

## Usage in apps/partner

```typescript
// Server component / action
import { getAuthContextWithType } from "@polso/auth/get-session"

const ctx = await getAuthContextWithType()
if (ctx.orgType !== "partner") redirect("/")
```

## Environment variables

```env
NEON_AUTH_BASE_URL   # required — set by Neon
NEON_PROJECT_ID      # required — set by Neon
```
