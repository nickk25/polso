# features/team

Team member management and invitations — serves `/settings/team` and the public accept page `/invite/[token]`.

## Files

- `actions/send-invite.ts` — admin/owner-gated; enforces `requireLimit("maxUsers")` against members + pending invites, creates `Invitation` with token, sends `sendUserInvited` email and tracks `emailStatus`/`resendEmailId` (failure keeps the invite)
- `actions/accept-invite.ts` — validates token; `partner_client` role branch creates or links a client org (`createClientOrgForUser`) + upserts `PartnerClient`, may return `needs_org_selection` for a UI picker, and notifies the partner (`sendPartnerClientConnected`, gated by `notifyOnClientConnected`); team branch creates `UserOrganization`
- `actions/resend-invite.ts` / `actions/revoke-invite.ts` — admin-gated; resend re-emails pending non-expired invites, revoke sets status `revoked`
- `actions/manage-member.ts` — `changeMemberRoleAction` (owner-only, not self/owner), `removeMemberAction` (admin/owner; only owner removes admins; owner immovable)
- `queries/get-team-members.ts` — members with lazy backfill of `memberName/Email/Image` from the current session; also `getTeamMemberCount`, `isUserAdmin`, `getTeamMemberRole`
- `queries/get-pending-invites.ts` — pending non-expired invites (+ count, `hasPendingInvite`)
- `queries/get-invitation-by-token.ts` — `getInvitationByToken` + `validateInvitationToken` (not_found/expired/already_accepted/revoked)
- `queries/get-user-client-orgs.ts` — user's client-type orgs (for the partner-invite org picker)
- `lib/generate-token.ts` — 64-char hex token, 7-day expiry
- `lib/ensure-client-org.ts` — `createClientOrgForUser(tx, …)`: creates a `type: "client"` org with the user as owner inside a transaction
- `components/` — `InviteDialog` (email + role, `InlineUpgrade` on limit error), `PendingInvitesTable` (email status icons, resend/revoke), `TeamMembersTable` (role badges, role-change/remove menu); `index.ts` re-exports everything

## Key flows

- All mutations check the caller's `UserOrganization.role` directly (not just auth context) before acting; everything revalidates `/settings/team` (accept also `/dashboard`)
- "Already a member" detection on send relies on a previously accepted `Invitation` for that email (Neon Auth users aren't directly queryable)
- Accept-invite is the bridge between the partner app and web: partner-issued `partner_client` invites land here and provision the client org

## Data & integration

- Models: Invitation, UserOrganization, Organization, PartnerClient
- i18n namespace: `team`
- Used by / uses: `app/(dashboard)/settings/team/page.tsx`, `app/(marketing)/invite/[token]/`; uses `features/billing` (`requireLimit`), `@polso/email`, `@polso/db` (`getPartnerNotificationEmail`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
