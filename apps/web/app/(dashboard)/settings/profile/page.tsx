import { neonAuth } from "@neondatabase/auth/next/server"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { ProfileSection } from "@/features/settings/components/profile-section"

export default async function ProfilePage() {
  const t = await getTranslations("profile")
  const { user } = await neonAuth()

  if (!user) redirect("/auth/sign-in")

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("yourProfile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSection
              userId={user.id}
              userName={user.name ?? null}
              userEmail={user.email ?? null}
              userImage={user.image ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
