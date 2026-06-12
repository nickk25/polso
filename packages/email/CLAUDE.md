# packages/email — @polso/email

Resend email client + 26 transactional email templates built with React Email.

## What it exports

```typescript
// from "@polso/email" (main entry)
getResend()            // lazy Resend client singleton
FROM_EMAIL             // from EMAIL_FROM env ("" if unset)
FROM_FOUNDER           // from EMAIL_FROM_FOUNDER env ("" if unset)
getEmailTranslations() // i18n strings for email templates
Locale                 // type — "en" | "es"
defaultLocale          // "es"
locales                // ["en", "es"]

// from "@polso/email/send"
send*()                // 26 named send functions — one per email type
```

## Send functions

Located in `src/send.ts`. Each wraps a React Email template and calls `getResend().emails.send()`. Names follow `send<Name>()` (no `Email` suffix). Examples:

- `sendWelcome(to, name, locale?)`
- `sendUserInvited(to, inviterName, organizationName, inviteToken, locale?)`
- `sendLowBalanceAlert(to, name, accountName, currentBalance, threshold, locale?)`
- `sendOtpSignIn(to, code, locale?)`
- etc. — covers welcome/trial/subscription, bank connect/disconnect/sync, alerts, invites, partner digests, and OTP emails

## Templates

React Email components at `templates/*.tsx` (package root, not `src/`). Shared layout at `templates/components/email-layout.tsx`.

## Adding a new email

1. Create template at `templates/<name>.tsx` — extend `EmailLayout`
2. Add a `send<Name>Email()` function in `src/send.ts`
3. Add translation strings to `messages/{en,es}/emails.json`

## Locale

`Locale` is defined locally as `"en" | "es"` in `src/locale.ts`. It is **not** imported from `next-intl` — this package has no Next.js dep.

## Environment variables

```env
RESEND_API_KEY        # passed lazily to the Resend client inside getResend() (not validated)
EMAIL_FROM            # from address for product emails — e.g. "Polso <hello@polso.app>"
EMAIL_FROM_FOUNDER    # from address for personal emails — e.g. "Nick <nick@polso.app>"
NEXT_PUBLIC_APP_URL   # base URL for links inside emails (dashboard, invite, settings)
```
