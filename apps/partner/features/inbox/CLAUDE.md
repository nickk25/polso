# features/inbox

Receipt/invoice inbox for a client: advisor uploads documents and lists OCR-processed items. Serves `/clients/[clientId]/inbox`.

## Files

- `actions/upload-inbox-item.ts` — `uploadInboxItemAction`: validates type/size, uploads to R2 (`inbox/<clientId>/<nanoid>.<ext>`), creates `InboxItem` (status `processing`, source `upload`), then OCR-processes in the background
- `queries/get-client-inbox.ts` — paginated inbox items (default 50/page) for the client, newest first, with amount/tax/status/matched transactionId

## Key flows

- Both action and query verify the active `PartnerClient` link first (action returns NOT_FOUND, query calls `notFound()`)
- Upload accepts multiple files (base64), validated against `UPLOAD_ACCEPTED_TYPES` / `UPLOAD_MAX_FILE_SIZE` from `@/lib/upload`
- OCR runs in `after()` (post-response): `processInboxItem` from `@polso/inbox`, max 3 concurrent calls to avoid Anthropic rate limits on bulk uploads; revalidates `/clients/[clientId]/inbox` and `/conciliation` when done
- Items are created on the CLIENT org (`organizationId: clientId`), not the partner org — they show up in the client's own web app too

## Data & integration

- Models: PartnerClient, InboxItem
- Used by / uses: `app/(dashboard)/clients/[clientId]/inbox/page.tsx`, `components/inbox/upload-inbox-button.tsx`; `@polso/storage` (R2), `@polso/inbox` (OCR pipeline); files served by `app/api/inbox/`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
