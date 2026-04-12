import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Gear, Bank, User, Bell, Buildings, UsersThree, Robot } from "@phosphor-icons/react/dist/ssr"

export default async function SettingsPage() {
  const t = await getTranslations("settings")

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Buildings className="h-5 w-5" />
              <CardTitle>{t("organization")}</CardTitle>
            </div>
            <CardDescription>
              {t("organizationDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/organization">{t("manageOrganization")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>{t("profile")}</CardTitle>
            </div>
            <CardDescription>
              {t("profileDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/profile">{t("editProfile")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bank className="h-5 w-5" />
              <CardTitle>{t("bankConnections")}</CardTitle>
            </div>
            <CardDescription>
              {t("bankConnectionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/banking">{t("manageBanks")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>{t("notifications")}</CardTitle>
            </div>
            <CardDescription>
              {t("notificationsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/notifications">{t("configure")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gear className="h-5 w-5" />
              <CardTitle>{t("preferencesTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("preferencesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/preferences">{t("editPreferences")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersThree className="h-5 w-5" />
              <CardTitle>{t("teamTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("teamDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/team">{t("manageTeam")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Robot className="h-5 w-5" />
              <CardTitle>{t("agentTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("agentDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/agent">{t("manageAgent")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
