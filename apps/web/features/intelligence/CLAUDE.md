# features/intelligence

Recurring expense pattern detection and lifecycle management (confirm/pause/dismiss). Powers `/recurring`.

## Files

- `actions/detect-patterns.ts` — `detectPatternsAction`: auth wrapper around `detectPatternsForOrg`, revalidates `/recurring`, `/transactions`, `/dashboard`
- `actions/manage-pattern.ts` — `confirmPatternAction`, `dismissPatternAction`, `pausePatternAction`, `resumePatternAction`, `deletePatternAction`
- `lib/detect-patterns-core.ts` — `detectPatternsForOrg`: runs `detectRecurringPatterns` (`@polso/intelligence`) over the last year of expense entries, creates/updates RecurringPatterns, tags matched entries `entryType: "fixed"`; `checkMissedPayments` pauses active patterns past next-expected-date + 7-day grace
- `queries/get-recurring-patterns.ts` — `getAllPatternsGrouped` → `{ confirmed, suggested, paused, currency }`; `computeMonthlyTotal` normalizes any frequency to a monthly amount
- `components/` — `DetectPatternsButton`; `RecurringPatternCard` renders one of three states (`suggestion` confirm/dismiss, `active` pause/delete, `paused` resume/delete) with confirm dialogs

## Key flows

- Dismiss creates a `DismissedPattern` (by counterparty or name) so re-detection skips it, resets linked entries to `variable`, and deletes the pattern; delete does the same WITHOUT a DismissedPattern, so the pattern can be re-detected
- Detection skips dismissed counterparties/names; existing patterns are updated in place (a confirmed pattern keeps its user-facing `frequency`)
- Patterns paused for `missed_payment` auto-resume when detection finds a newer occurrence; manually paused patterns are never auto-resumed
- New patterns start `isConfirmed: false` (shown as suggestions sorted by confidence)
- The daily cron also calls `detectPatternsForOrg` per org

## Data & integration

- Models: RecurringPattern, DismissedPattern, Entry, Counterparty, Category, Organization (currency)
- i18n namespace: `recurring`
- Used by / uses: `app/(dashboard)/recurring/page.tsx`, `/api/cron/sync-transactions`, `features/agent` (`list-recurring-patterns` tool); uses `@polso/intelligence`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
