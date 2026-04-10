# packages/email — @polso/email

Resend email client + 20 transactional email templates built with React Email.

## What it exports

```typescript
// from "@polso/email" (main entry)
getResend()            // lazy Resend client singleton
FROM_EMAIL             // "Polso <hello@polso.com>"
FROM_FOUNDER           // "Nick from Polso <nick@polso.com>"
getEmailTranslations() // i18n strings for email templates
Locale                 // type — "en" | "es"
defaultLocale          // "en"
locales                // ["en", "es"]

// from "@polso/email/send"
send*()                // 20 named send functions — one per email type
```

## Send functions

Located in `src/send.ts`. Each wraps a React Email template and calls `resend.emails.send()`. Examples:

- `sendWelcomeEmail(to, locale)`
- `sendInvitationEmail(to, inviterName, orgName, token, locale)`
- `sendLowBalanceAlertEmail(to, accountName, balance, threshold, locale)`
- `sendExportReadyEmail(to, exportUrl, locale)`
- etc.

## Templates

React Email components at `src/templates/*.tsx`. Shared layout at `src/templates/components/email-layout.tsx`.

## Adding a new email

1. Create template at `src/templates/<name>.tsx` — extend `EmailLayout`
2. Add a `send<Name>Email()` function in `src/send.ts`
3. Add translation strings to `messages/{en,es}/emails.json`

## Locale

`Locale` is defined locally as `"en" | "es"` in `src/locale.ts`. It is **not** imported from `next-intl` — this package has no Next.js dep.

## Environment variable

```env
RESEND_API_KEY   # required at runtime, checked inside getResend()
```
