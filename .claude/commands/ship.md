---
description: Review, commit, and push changes in one flow. Standard way to land code — never push without reviewing first.
---
# Ship

Review, commit, and push changes in one flow. This is the standard way to land code — never push without reviewing first.

## Instructions

### Phase 1: Review

1. Run the `/review` command logic:
   - Run `git diff --cached` to get staged changes; if empty, run `git diff` for unstaged changes; if still empty, run `git diff HEAD~1` for the last commit
   - Read `docs/CODE_PATTERNS.md` for the full pattern reference
   - Check every changed file against the project rules (see `/review` for the full checklist)
   - Report findings by severity: **Error**, **Warning**, **Info**

2. **If any Errors or Warnings are found:**
   - List them clearly
   - Fix each one automatically (edit the files)
   - Re-run `pnpm build` to confirm the fixes compile
   - Re-run the review to confirm all issues are resolved

3. **If only Info findings (or none):** proceed to Phase 2

### Phase 2: Commit (with mandatory split check)

4. Run `git status` to see all changed + untracked files
5. Run `git log --oneline -5` to match the commit message style

6. **Layer analysis — do this before staging anything:**

   Classify every changed/untracked file into one of these layers:
   - `schema` → `prisma/schema.prisma`
   - `backend` → `features/*/lib/`, `features/*/queries/`, `features/*/actions/`
   - `frontend` → `features/*/components/`, `app/(dashboard)/*/`, `messages/*/[feature].json`, `lib/i18n/messages.ts`
   - `navigation` → `components/layout/app-sidebar.tsx`, `messages/*/common.json`
   - `settings` → `features/settings/**`, `messages/*/settings.json`
   - `infra` → `app/api/cron/`, `vercel.json`, root config files

   **If changes span more than one layer → create a separate commit per layer.**
   Do NOT bundle multiple layers into one commit, even for a single feature.

7. For each layer with changes (in the order: schema → backend → frontend → navigation → settings → infra):
   - Stage only the files for that layer
   - Create a commit with an appropriate message:
     - Format: `type: :emoji: description` (lowercase, imperative mood)
     - Types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `perf`
     - Include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

### Phase 3: Push

8. Push to remote: `git push`
9. Report the final result:
   - All commit hashes and messages (one per layer)
   - Total files changed
   - Review summary (errors fixed, warnings fixed, info items noted)
