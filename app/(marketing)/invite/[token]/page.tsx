import Link from "next/link"
import { neonAuth } from "@neondatabase/auth/next/server"
import { Buildings, WarningCircle, Clock } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"
import { getLocale } from "@/lib/i18n/get-locale"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { validateInvitationToken } from "@/features/team/queries/get-invitation-by-token"
import { AcceptInviteButton } from "./accept-invite-button"
import { SignOutButton } from "./sign-out-button"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const { user } = await neonAuth()
  const t = await getTranslations("invite")
  const locale = await getLocale()

  const validation = await validateInvitationToken(token)

  // Handle invalid invitations
  if (!validation.valid) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <WarningCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>
              {validation.reason === "not_found" && t("notFound")}
              {validation.reason === "expired" && t("expired")}
              {validation.reason === "already_accepted" && t("alreadyAccepted")}
              {validation.reason === "revoked" && t("revoked")}
            </CardTitle>
            <CardDescription>
              {validation.reason === "not_found" && t("notFoundDesc")}
              {validation.reason === "expired" && t("expiredDesc")}
              {validation.reason === "already_accepted" && t("alreadyAcceptedDesc")}
              {validation.reason === "revoked" && t("revokedDesc")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <Link href="/">{t("goToHomepage")}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const { invitation } = validation

  // Compute days remaining server-side to avoid calling Date.now() during render
  const now = new Date()
  const daysRemaining = Math.ceil(
    (invitation.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const expiresText = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    daysRemaining,
    "day"
  )

  // If user is logged in with a different email
  const userEmail = user?.email?.toLowerCase()
  const inviteEmail = invitation.email.toLowerCase()
  const emailMismatch = userEmail && userEmail !== inviteEmail

  if (emailMismatch) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <WarningCircle className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>{t("emailMismatch")}</CardTitle>
            <CardDescription>
              {t("emailMismatchDesc", { inviteEmail: invitation.email, userEmail: user?.email ?? "" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {t("emailMismatchHelp")}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <SignOutButton
              label={t("signOut")}
              redirectTo={`/invite/${token}`}
            />
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">{t("goToDashboard")}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Valid invitation - show accept UI
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Buildings className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("joinOrg", { orgName: invitation.organizationName })}</CardTitle>
          <CardDescription>
            {t("invitedAsRole", { role: invitation.role })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                <Buildings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{invitation.organizationName}</p>
                <p className="text-xs text-muted-foreground">
                  {t("invitationFor", { email: invitation.email })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{t("expires", { time: expiresText })}</span>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3">
          {user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href={`/auth/sign-in?callbackUrl=/invite/${token}`}>
                  {t("signInToAccept")}
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t("noAccount")}{" "}
                <Link
                  href={`/auth/sign-up?callbackUrl=/invite/${token}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {t("signUp")}
                </Link>
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
