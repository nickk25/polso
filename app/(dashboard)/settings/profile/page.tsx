import Link from "next/link"
import { neonAuth } from "@neondatabase/auth/next/server"
import { redirect } from "next/navigation"
import { SettingsHeader } from "@/features/settings/components/settings-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCircle, Lock, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr"

export default async function ProfilePage() {
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
        title="Profile"
        description="View and manage your account"
      />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Your account information managed by Neon Auth
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
                  Manage Profile
                  <ArrowSquareOut className="h-3 w-3 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account/security" className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Security Settings
                  <ArrowSquareOut className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Profile and security settings are managed through Neon Auth.
              Click the buttons above to access these settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
