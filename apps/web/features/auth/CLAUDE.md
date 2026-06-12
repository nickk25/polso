# features/auth

Terms/privacy consent recording and status checks — backs the /onboarding/consent gate (no UI of its own; the form lives in features/onboarding's ConsentStep).

## Files

- `actions/record-consent.ts` — `recordConsentAction()`: upserts `UserConsent` and appends `ConsentHistory` in one transaction, capturing IP (last X-Forwarded-For hop) + user agent; revalidates `/onboarding` and `/dashboard`
- `queries/get-consent-status.ts` — `needsConsent(userId)`: React `cache()`-wrapped; true when no row exists or stored versions differ from `TERMS_VERSION` / `PRIVACY_VERSION`

## Key flows

- Both dashboard and onboarding layouts call `needsConsent(user.id)` and `redirect("/onboarding/consent")` when true; the consent page itself redirects back to `/onboarding` once consent is current
- Version constants come from `@polso/auth/consent` — bumping `TERMS_VERSION`/`PRIVACY_VERSION` re-triggers the gate for everyone
- Keyed by `userId` (not organization) — consent is per user, recorded before any org exists

## Data & integration

- Models: UserConsent, ConsentHistory
- Used by / uses: `app/(dashboard)/layout.tsx`, `app/(onboarding)/layout.tsx`, `app/onboarding/consent/page.tsx`, `features/onboarding/components/steps/consent-step.tsx` (calls the action); uses `@polso/auth` (`get-session`, `consent`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
