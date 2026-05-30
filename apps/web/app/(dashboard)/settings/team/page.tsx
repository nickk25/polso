import { InviteDialog } from "@/features/team/components/invite-dialog"
import { PendingInvitesTable } from "@/features/team/components/pending-invites-table"
import { TeamMembersTable } from "@/features/team/components/team-members-table"
import { UsageIndicator } from "@/components/shared/upgrade-prompt"
import { getTeamMembers, getTeamMemberRole } from "@/features/team/queries/get-team-members"
import { getPendingInvites } from "@/features/team/queries/get-pending-invites"
import { getSubscription } from "@/features/billing/queries/get-subscription"
import { getAuthContext } from "@polso/auth/get-session"
import { getLimit } from "@/lib/plans"

export default async function TeamSettingsPage() {
  const { userId } = await getAuthContext()

  const [members, invites, subscription, userRole] = await Promise.all([
    getTeamMembers(),
    getPendingInvites(),
    getSubscription(),
    getTeamMemberRole(userId),
  ])

  const plan = subscription?.plan ?? "starter"
  const maxUsers = getLimit(plan, "maxUsers")
  const currentCount = members.length + invites.length
  const isAtLimit = currentCount >= maxUsers

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Header with usage and invite button */}
        <div className="flex items-center justify-between">
          <UsageIndicator
            limit="maxUsers"
            currentCount={currentCount}
            maxAllowed={maxUsers}
            showUpgradeAt={80}
          />
          <InviteDialog disabled={isAtLimit} currentPlan={plan} />
        </div>

        {/* Pending invitations */}
        <PendingInvitesTable invites={invites} />

        {/* Team members */}
        <TeamMembersTable
          members={members}
          currentUserId={userId}
          currentUserRole={userRole ?? "member"}
        />
      </div>
    </div>
  )
}
