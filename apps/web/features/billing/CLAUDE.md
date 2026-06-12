# features/billing

Subscription state sync with Creem and plan limit enforcement. No dashboard route of its own — consumed by settings pages, the Creem webhook, and other features.

## Files

- `actions/sync-subscription.ts` — `syncSubscription` (pull state from Creem API), `updateOrganizationPlan`, `handleSubscriptionCanceled`, `handleSubscriptionExpired` (downgrade to starter), `findOrganizationByCreemCustomer/Subscription` — webhook helpers
- `queries/get-subscription.ts` — `getSubscription` / `getSubscriptionByOrganizationId` → `SubscriptionInfo` (plan, interval, trial/cancel/expiry flags, scheduled downgrade)
- `queries/get-usage.ts` — `getOrganizationUsage` (+ `ById`), `getBankConnectionCount`, `getUserCount` — counts non-disconnected accounts and org members
- `lib/require-limit.ts` — `requireLimit` (throws `LimitExceededError`), `checkLimit` (boolean), `getLimitInfo` (for upgrade prompts)

## Key flows

- `/api/webhooks/creem` calls `updateOrganizationPlan` / `handleSubscriptionCanceled` / `handleSubscriptionExpired` and looks up orgs via the `findOrganizationByCreem*` helpers
- Subscription updates clear `scheduledPlanType/Interval/ChangeAt`; expiry resets the org to `starter` and nulls Creem IDs
- `requireLimit` is called in server actions before creating resources (e.g. `features/team/actions/send-invite.ts` for the users limit)
- Plan validation always falls back to `"starter"` when `planType` is invalid

## Data & integration

- Models: Organization (plan/Creem/scheduled fields), Account, UserOrganization
- Used by / uses: `/api/webhooks/creem`, `app/(dashboard)/settings/banking` + `settings/team` pages, `features/team`; uses `@/lib/creem` and `@/lib/plans` (`@polso/plans`, `@polso/billing`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
