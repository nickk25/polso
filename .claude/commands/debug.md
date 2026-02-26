# Debug

Systematically diagnose and fix a bug, build failure, or runtime error.

## Instructions

### Phase 1: Reproduce & Understand

1. **Identify the symptom** from the user's description:
   - Build error → run `pnpm build 2>&1` and capture the full output
   - Runtime error → read the error message, stack trace, and browser console
   - UI bug → use preview tools to screenshot the current state
   - Type error → read the exact file and line from the error output

2. **Gather context** — read these files in parallel:
   - The file(s) mentioned in the error
   - The nearest related files (if the error is in a component, also read its parent page and the action/query it calls)
   - `docs/CODE_PATTERNS.md` to understand what the correct pattern should be

3. **Trace the data flow** — follow the chain:
   ```
   Page → Query/Action → Prisma → Database
   Page → Component → Props/State → User interaction
   ```
   Identify exactly WHERE in this chain the bug occurs.

### Phase 2: Diagnose Root Cause

4. **Ask "Why?" five times** — don't stop at the surface symptom:
   - ❌ "The component crashes" → that's the symptom
   - ✅ "The query returns `null` because the `include` is missing the relation" → that's the root cause

5. **Check for pattern violations** — compare the broken code to the project conventions:
   - Missing `organizationId` filter?
   - Wrong return type on a server action?
   - Missing `"use client"` directive?
   - Stale Prisma types? (needs `pnpm prisma generate`)
   - Missing `revalidatePath()` causing stale data?

6. **Form a hypothesis** and state it clearly before making any change:
   > "The bug is caused by X because Y. The fix is Z."

### Phase 3: Fix

7. **Make the minimum change** that fixes the root cause:
   - Fix ONE thing at a time
   - Don't refactor while debugging
   - Don't add features while debugging
   - If the fix requires more than ~20 lines changed, STOP and present the plan first

8. **Apply the fix** — edit the file(s)

### Phase 4: Verify

9. **Prove the fix works:**
   - Run `pnpm build` — must pass with zero errors
   - If it was a UI bug, use preview tools to screenshot the fixed state
   - If it was a data bug, verify the query returns correct results

10. **Check for regressions** — did the fix break anything else?
    - If the fix touched a shared utility, check other files that import it
    - If the fix touched a query, check all components that use that data

11. **Report what happened:**
    - Root cause (one sentence)
    - What was changed (file list)
    - How it was verified

### Anti-Patterns — Do NOT:
- Apply random fixes hoping something works
- Add `try/catch` around the symptom instead of fixing the cause
- Suppress TypeScript errors with `as any` or `@ts-ignore`
- Change multiple things at once (can't tell what actually fixed it)
- Skip the build verification step
