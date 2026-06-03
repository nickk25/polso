import { neonAuth } from "@neondatabase/auth/next/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { ProfileSection } from "@/features/settings/components/profile-section"

export default async function PerfilPage() {
  const { user } = await neonAuth()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSection
            userId={user?.id ?? ""}
            userName={user?.name ?? null}
            userEmail={user?.email ?? null}
            userImage={user?.image ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
