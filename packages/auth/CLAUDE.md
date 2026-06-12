# packages/auth — @polso/auth

Shared Neon Auth wrapper used by both `apps/web` and `apps/partner`.

## What it exports

```typescript
// from "@polso/auth" (server-side only — no authClient here)
getAuthContext()          // → { userId, organizationId } — throws if not authenticated
getAuthContextWithType()  // → { userId, organizationId, orgType } — partner org only; throws if user has no partner org
getAuthContextOptional()  // → AuthContext | null — safe version
getUserProfile()          // → { id, name, email } — profile info without org context
authServer                // Neon Auth server instance
AuthContext               // type — { userId, organizationId }
PartnerAuthContext        // type — extends AuthContext with orgType

// from "@polso/auth/client" (use in client components)
authClient                // Neon Auth browser client

// from "@polso/auth/server"
authServer

// from "@polso/auth/get-session"
getAuthContext, getAuthContextWithType, getAuthContextOptional, getUserProfile

// from "@polso/auth/ui" (use in auth pages — "use client")
EmailOtpForm              // 2-step email OTP sign-in form (email → 6-digit code)

// from "@polso/auth/consent"
TERMS_VERSION, PRIVACY_VERSION   // current consent document versions (date strings)
```

## Auth provider

Uses `@neondatabase/auth` (Neon Auth, based on Better Auth). Auth state is managed by Neon — no custom server needed.

## EmailOtpForm

`src/ui/email-otp-form.tsx` — fully self-contained sign-in form. Two steps:

1. **Email step** — collects email, validates, calls `authClient.emailOtp.sendVerificationOtp`
2. **OTP step** — 6 individual digit inputs (flush/connected), auto-submits on completion

### Props

```typescript
interface EmailOtpFormProps {
  heading?: string           // default: "Bienvenido a Polso"
  subheading?: string        // default: "Inicia sesión o crea una cuenta"
  badge?: string             // optional small uppercase label above the heading
  redirectTo?: string        // default: "/dashboard" — where to navigate after sign-in
  translations?: {           // override all internal strings (for i18n in apps/web)
    emailPlaceholder?: string
    emailRequired?: string
    emailInvalid?: string
    sendError?: string
    sending?: string
    continueLabel?: string
    codeSentPrefix?: string  // e.g. "Te enviamos un código a"
    codeResent?: string
    resendPrompt?: string
    resendLabel?: string
    otpError?: string
  }
}
```

Defaults for all `translations` fields are Spanish — suitable for `apps/partner` (no i18n).
`apps/web` passes translated strings via the `translations` prop from `useTranslations("auth")`.

### Behaviour guarantees

- Open redirect protection: sessionStorage `authCallbackUrl` is validated with `isSafeRedirect()` before navigating (falls back to `redirectTo`)
- Email normalization: trimmed + lowercased before sending and storing in state
- Hard navigation via `window.location.href` after verify — ensures the fresh session cookie is sent with the next request (avoids the `router.push` + `router.refresh` race)
- `sessionStorage` access is wrapped in try/catch (Safari private mode compatibility)
- `loading` guard on OTP inputs — prevents double-submission during async verify
- `autoComplete="one-time-code"` on the first OTP input — enables SMS autofill on mobile
- OTP errors shown via `toast.error()` (non-blocking); email errors shown inline

### Usage in apps/web

```typescript
// apps/web/app/auth/[path]/page.tsx
import { useTranslations } from "next-intl"
import { EmailOtpForm } from "@polso/auth/ui"

const t = useTranslations("auth")

<EmailOtpForm
  heading={t("form.heading")}
  subheading={t("form.subheading")}
  translations={{
    emailPlaceholder: t("form.emailPlaceholder"),
    // ... all form.* keys
  }}
/>
```

Translation keys live in `apps/web/messages/{en,es}/auth.json`.

### Usage in apps/partner

```typescript
// apps/partner/app/auth/[path]/page.tsx
import { EmailOtpForm } from "@polso/auth/ui"

<EmailOtpForm
  heading="Polso Partner"
  subheading="Panel de asesoría"
  redirectTo="/"
/>
// No translations prop needed — Spanish defaults apply
```

## Usage in apps/partner (server-side auth)

```typescript
// Server component / action
import { getAuthContextWithType } from "@polso/auth/get-session"

// Only matches partner orgs — throws "Organization not found"
// if the user does not belong to one
const ctx = await getAuthContextWithType()
```

## Environment variables

```env
NEON_AUTH_BASE_URL   # required — set by Neon
```
