#!/bin/bash
# Pre-push gate: blocks `git push` when the commits being pushed touch a
# feature module (apps/{web,partner}/features/<name>/) without also updating
# that feature's CLAUDE.md in the same push range.
#
# Bypass: include "docs-ok" in any commit message in the range — for changes
# that genuinely don't affect what the doc states (typo fixes, pure refactors).
#
# Fails open on any git/parsing error: a broken hook must never block work.

INPUT=$(cat)

if command -v jq >/dev/null 2>&1; then
  CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  CMD=$INPUT
fi

case "$CMD" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || exit 0
CHANGED=$(git diff --name-only "$UPSTREAM..HEAD" 2>/dev/null) || exit 0
[ -z "$CHANGED" ] && exit 0

if git log --format=%B "$UPSTREAM..HEAD" 2>/dev/null | grep -qi "docs-ok"; then
  exit 0
fi

MISSING=""
FEATURES=$(printf '%s\n' "$CHANGED" | sed -nE 's#^(apps/(web|partner)/features/[^/]+)/.*#\1#p' | sort -u)
for FEAT in $FEATURES; do
  if ! printf '%s\n' "$CHANGED" | grep -qx "$FEAT/CLAUDE.md"; then
    MISSING="$MISSING  - $FEAT/CLAUDE.md\n"
  fi
done

if [ -n "$MISSING" ]; then
  printf 'BLOCKED git push: feature code changed without updating its CLAUDE.md:\n%b\nRead each doc and update it to match the change (amend or add a commit). If the doc is genuinely unaffected, include "docs-ok" in a commit message in the range and push again.\n' "$MISSING" >&2
  exit 2
fi

exit 0
