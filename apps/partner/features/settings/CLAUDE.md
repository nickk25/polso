# features/settings

Partner (asesoría) settings — org profile/logo, team, preferences, notifications, regional — serving `/settings`, `/settings/perfil`, `/settings/equipo`, `/settings/preferencias`, `/settings/notificaciones`, `/settings/regional`.

## Files

- `actions/update-organization-profile.ts` — name, taxId, address, contactEmail on the partner org.
- `actions/upload-organization-logo.ts` / `actions/delete-organization-logo.ts` — logo to R2 (`org-logos/<orgId>/`, max 1 MB, PNG/JPG/WebP/SVG); replaces and best-effort deletes the old file.
- `actions/upload-profile-image.ts` — user avatar to R2 (`profile-images/<userId>`, max 2 MB); only requires Neon Auth session, returns `/api/profile-image/<userId>` URL.
- `actions/update-csv-separator.ts` — `csvSeparator` (`;`, `,`, tab).
- `actions/update-export-defaults.ts` — `defaultExportRange` (month/quarter/year).
- `actions/update-invitation-expiry.ts` — `invitationExpiryDays` (1–30).
- `actions/update-notification-settings.ts` — `digestCadence` (none/daily/weekly) + `notifyOnClientConnected`.
- `actions/update-reminder-settings.ts` — `reminderCooldownHours` (1–168), `receiptReminderHours` (24–720), `autoRemindersEnabled`.
- `actions/update-regional-settings.ts` — currency, fiscalYearStart (1–12), dateFormat (whitelisted values).
- `components/` — one section component per action (form + toast), `settings-tabs.tsx` (sticky tab nav across the six settings routes), `profile-section.tsx` (name/avatar via Neon Auth `authClient.updateUser`), `theme-section.tsx` (next-themes selector).

## Key flows

- Every org-level action calls `getPartnerAuthContext()` and rejects when `ctx.orgType !== "partner"`; all writes target the partner's own `Organization` row (no client data, so no PartnerClient check needed).
- All actions validate against whitelists/ranges server-side and `revalidatePath("/settings")` (profile/logo also revalidate `/`).
- Reminder settings here feed the proactive feature (cooldown gate in `send-reminder.ts`, cron dedupe window); digest cadence feeds the notifications digest in the daily cron.
- Logo upload writes the new R2 key first, updates the DB, then deletes the old key (non-fatal on failure) to avoid orphaning.

## Data & integration

- Models: Organization (writes); user profile lives in Neon Auth, not Prisma
- Used by / uses: `app/(dashboard)/settings/**` pages + layout; packages `@polso/storage` (R2), `@polso/utils` (ActionResponse), Neon Auth

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
