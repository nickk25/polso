# features/waitlist

Pre-launch waitlist signup from the marketing landing page (no dashboard route).

## Files

- `actions/join-waitlist.ts` — `joinWaitlist(formData)`: validates email, adds the contact to the Resend segment `RESEND_WAITLIST_SEGMENT_ID` (ignores "already exists"), then sends the localized founder welcome email via `sendWaitlistFounder`; returns `{ success, error? }` (not the standard `ActionResponse`)

## Key flows

- No auth, no database — everything goes through Resend (contacts + email); segment add is skipped silently if the env var is unset, but a failed welcome email fails the action
- Locale for the email comes from `getLocale()` (`NEXT_LOCALE` cookie)

## Data & integration

- i18n namespace: `marketing` (form strings live in the consumer)
- Used by / uses: `app/(marketing)/_components/waitlist-form.tsx` (landing page); uses `@/lib/email` (Resend)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
