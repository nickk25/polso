# features/settings

User and org settings — serves the `/settings/*` tab pages (profile, organization, banking, notifications, preferences, agent, partner-access; `/settings` redirects to `/settings/profile`).

## Files

- `actions/generate-agent-link.ts` — `generateAgentLinkCodeAction()`: deletes the org's previous codes, creates a 6-digit `AgentLinkCode` with 5-min expiry (collision retry), revalidates `/settings/agent`
- `actions/update-organization.ts` — name/currency/fiscalYearStart/dateFormat on Organization
- `actions/update-notifications.ts` — upserts per-user `NotificationSetting` (email/in-app flags + thresholds)
- `actions/update-preferences.ts` — upserts `UserPreference` (theme/locale) and syncs the `NEXT_LOCALE` cookie for next-intl
- `actions/upload-profile-image.ts` — validates PNG/JPG/WebP ≤ 2 MB, uploads base64 to R2 at `profile-images/<userId>`, returns `/api/profile-image/<userId>` URL
- `queries/` — `get-agent-connections` (org `whatsappPhone` + member `telegramChatId`), `get-organization-settings`, `get-notification-settings` / `get-user-preferences` (return defaults when no row), `get-partner-access` (PartnerClient links where `clientId` = current org)
- `components/` — one card/form per tab: `profile-section` (name/password via `authClient`, avatar via upload action), `organization-form`, `notifications-form`, `preferences-form`, `agent-connections-card` (Telegram link code countdown + WhatsApp QR), `bank-connection-card` (sync/reconnect/disconnect via `features/banking` actions; `bank-account-card` is the older per-account variant), `partner-access-list` (read-only), `settings-tabs` (nav), `settings-header`, `connect-bank-button` (re-export of `@/components/banking/connect-bank-button`)

## Key flows

- Agent link codes generated here are consumed by `/api/webhooks/telegram` and `/api/webhooks/whatsapp` to link a chat to the org (one active code at a time)
- `updateOrganizationAction` is also called by the onboarding `create-org-step`; `generateAgentLinkCodeAction` by the onboarding `connect-chat-step`
- Org/notification/preference forms autosave (debounced refs + `useCallback`), revalidating `/settings` + their own subroute
- Banking tab composes this feature's cards with `features/banking` queries/actions and `features/billing` connection limits

## Data & integration

- Models: Organization, UserOrganization, NotificationSetting, UserPreference, AgentLinkCode, PartnerClient
- i18n namespaces: `settings`, `profile`, `banking`, `agent` (`agent.connections`)
- Used by / uses: `app/(dashboard)/settings/*`, `features/onboarding`, Telegram/WhatsApp webhooks; uses `features/banking` actions, `@polso/storage`, `@polso/auth`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
