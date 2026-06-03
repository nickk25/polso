import { neonAuth } from "@neondatabase/auth/next/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { TeamMembersSection } from "@/features/team/components/team-members-section"
import { InviteTeammateDialog } from "@/features/team/components/invite-teammate-dialog"
import { getTeamData } from "@/features/team/queries/get-team-data"

export default async function EquipoPage() {
  const { user } = await neonAuth()
  const teamData = await getTeamData()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Equipo</CardTitle>
          <InviteTeammateDialog />
        </CardHeader>
        <CardContent>
          <TeamMembersSection
            members={teamData.members}
            invitations={teamData.invitations}
            currentUserId={user?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  )
}
