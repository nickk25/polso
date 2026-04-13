"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { authClient } from "@polso/auth/client"

interface SignOutButtonProps {
  label: string
  redirectTo: string
}

export function SignOutButton({ label, redirectTo }: SignOutButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut()
      router.replace(redirectTo)
    })
  }

  return (
    <Button
      className="w-full"
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? (
        <Spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      {label}
    </Button>
  )
}
