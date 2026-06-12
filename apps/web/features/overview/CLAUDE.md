# features/overview

Dashboard overview UI pieces — currently just the agent chat input used on `/dashboard`.

## Files

- `components/chat-input.tsx` — `ChatInput`: controlled textarea (Enter submits, Shift+Enter newline) with submit button and optional file attachments (paperclip + removable badges); accepts/filters files against `UPLOAD_ACCEPTED_TYPES` / `UPLOAD_MAX_FILE_SIZE` from `@/lib/upload`

## Key flows

- Fully controlled by the parent: `value`/`onChange`/`onSubmit`/`files`/`onFilesChange` props; the attach button only renders when `onFilesChange` is provided
- No actions, queries, or lib — submission and upload handling live in the consumer (`features/agent`)

## Data & integration

- Used by / uses: `features/agent/components/agent-surface.tsx` (rendered on `app/(dashboard)/dashboard/page.tsx`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
