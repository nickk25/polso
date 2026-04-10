import Link from "next/link"
import { neonAuth } from "@neondatabase/auth/next/server"
import { redirect } from "next/navigation"
import { SettingsHeader } from "@/features/settings/components/settings-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@polso/ui/avatar"
import { UserCircle, Lock, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"

export default async function ProfilePage() {
  const t = await getTranslations("profile")
  const { user } = await neonAuth()

  if (!user) {
    redirect("/auth/sign-in")
  }

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U"

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title={t("title")}
        description={t("subtitle")}
      />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("yourProfile")}</CardTitle>
            <CardDescription>
              {t("accountManagedBy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || undefined} alt={user.email || "User"} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name || user.email?.split("@")[0]}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" asChild>
                <Link href="/account/settings" className="inline-flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  {t("manageProfile")}
                  <ArrowSquareOut className="h-3 w-3 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account/security" className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t("securitySettings")}
                  <ArrowSquareOut className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("managedByNeonAuth")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
