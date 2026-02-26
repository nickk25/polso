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

### Phase 2: Commit

4. Run `git status` and `git diff` to see all changes (including any fixes from Phase 1)
5. Run `git log --oneline -5` to match the commit message style
6. Stage the relevant files (prefer specific file names over `git add .`)
7. Create the commit:
   - Format: `type: :emoji: description` (lowercase, imperative mood)
   - Types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `perf`
   - Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

### Phase 3: Push

8. Push to remote: `git push`
9. Report the final result:
   - Commit hash and message
   - Files changed count
   - Review summary (errors fixed, warnings fixed, info items noted)
