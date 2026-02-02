import Link from "next/link"
import { neonAuth } from "@neondatabase/auth/next/server"
import { Buildings, WarningCircle, Clock } from "@phosphor-icons/react/dist/ssr"
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

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const { user } = await neonAuth()

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
              {validation.reason === "not_found" && "Invitation Not Found"}
              {validation.reason === "expired" && "Invitation Expired"}
              {validation.reason === "already_accepted" && "Already Accepted"}
              {validation.reason === "revoked" && "Invitation Revoked"}
            </CardTitle>
            <CardDescription>
              {validation.reason === "not_found" &&
                "This invitation link is invalid or has been removed."}
              {validation.reason === "expired" &&
                "This invitation has expired. Please ask the team admin to send a new invitation."}
              {validation.reason === "already_accepted" &&
                "This invitation has already been used."}
              {validation.reason === "revoked" &&
                "This invitation has been cancelled by the team admin."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to Homepage</Link>
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
  const expiresText = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
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
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>, but
              you&apos;re logged in as <strong>{user?.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Please sign out and sign in with the correct email address, or ask the
            team admin to send a new invitation to your current email.
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/api/auth/signout">Sign Out</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
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
          <CardTitle>Join {invitation.organizationName}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a{" "}
            <strong className="capitalize">{invitation.role}</strong>
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
                  Invitation for {invitation.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Expires {expiresText}</span>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3">
          {user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href={`/api/auth/signin?callbackUrl=/invite/${token}`}>
                  Sign In to Accept
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/api/auth/signup?callbackUrl=/invite/${token}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Sign up
                </Link>
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
