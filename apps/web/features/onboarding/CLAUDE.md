# features/onboarding

4-step post-signup onboarding wizard (org setup → bank → how-it-works → chat bot) serving `/onboarding`, plus the consent step rendered by the `/onboarding/consent` gate page.

## Files

- `actions/complete-onboarding.ts` — `completeOnboardingAction()`: sets `Organization.onboardingCompletedAt`, fire-and-forget sends `sendWelcome` + `sendWelcomeFounder` (`@polso/email/send`), then `redirect("/dashboard")`
- `components/onboarding-flow-client.tsx` — `dynamic(..., { ssr: false })` wrapper around the flow (avoids Radix aria-controls hydration mismatch)
- `components/onboarding-flow.tsx` — split-panel stepper (marketing copy left, step form right); step keys `createOrg`, `connectBank`, `reconciliation`, `connectChat`
- `components/steps/create-org-step.tsx` — org name + currency form; submits via settings' `updateOrganizationAction`
- `components/steps/connect-bank-step.tsx` — wraps shared `ConnectBankButton` (`@/components/banking`); skippable; shows success state when `bankConnected`
- `components/steps/reconciliation-step.tsx` — static "what happens next" bullets, no data
- `components/steps/connect-chat-step.tsx` — Telegram linking: calls settings' `generateAgentLinkCodeAction` (6-digit code, 5-min countdown), then `completeOnboardingAction` on done/skip
- `components/steps/consent-step.tsx` — terms/privacy checkbox; calls `recordConsentAction` (features/auth) then `router.push("/onboarding")`; all strings passed as props (server-translated)

## Key flows

- `/onboarding/page.tsx` redirects: no user → sign-in, no client org → `/`, `onboardingCompletedAt` set → `/dashboard`; reads `?connected=true` (GoCardless callback return) to mark the bank step done
- Consent gate runs *before* the wizard: `/onboarding/consent` checks `needsConsent()` (features/auth) and only then allows `/onboarding`
- The feature has no queries of its own — steps reuse actions from `features/settings`, `features/auth`, and the shared banking connect button
- Telegram codes generated here are consumed by `/api/webhooks/telegram`

## Data & integration

- Models: Organization, UserOrganization (read in the action for the welcome email)
- i18n namespace: `onboarding` (consent strings come from `auth` via the consent page)
- Used by / uses: `app/(onboarding)/onboarding/page.tsx`, `app/onboarding/consent/page.tsx`; uses `features/settings` actions, `features/auth`, `@polso/email`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
