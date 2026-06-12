# features/team

Partner team management — invite, list, and remove asesoría teammates — serving `/settings/equipo`.

## Files

- `actions/invite-teammate.ts` — creates an `Invitation` (role `admin`, nanoid token, expiry from org `invitationExpiryDays`, default 7d) and emails it via `sendUserInvited`; tracks `emailStatus`/`resendEmailId`, marks `failed` on email error without rolling back.
- `actions/remove-teammate.ts` — deletes a `UserOrganization` membership; caller must be owner/admin, cannot remove self or the owner.
- `actions/revoke-teammate-invitation.ts` — sets a pending invitation to `revoked`.
- `queries/get-team-data.ts` — returns members + pending admin invitations for the partner org.
- `components/` — `team-members-section.tsx` (members/invitations table with role badges, remove/revoke confirm dialogs), `invite-teammate-dialog.tsx` (email form calling the invite action).

## Key flows

- All actions/queries use `getPartnerAuthContext()`; actions reject when `ctx.orgType !== "partner"`. Scope is the partner's own org — teammates, not clients — so no PartnerClient check applies.
- Invite dedupes against accepted invitations and non-expired pending admin invitations for the same email.
- Teammate invitations are distinguished from client invitations by `role: "admin"` and `clientName: null`.
- `getTeamData` lazily backfills the current user's `memberName/memberEmail/memberImage` on their `UserOrganization` row from the Neon Auth session.

## Data & integration

- Models: UserOrganization, Invitation, Organization
- Used by / uses: `app/(dashboard)/settings/equipo/page.tsx`; packages `@polso/email` (sendUserInvited via Resend), `@polso/utils` (ActionResponse), Neon Auth

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
