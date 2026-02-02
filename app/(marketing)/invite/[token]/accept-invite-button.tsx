"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Spinner } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { acceptInviteAction } from "@/features/team/actions/accept-invite"

interface AcceptInviteButtonProps {
  token: string
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAccept = () => {
    setError(null)

    startTransition(async () => {
      const result = await acceptInviteAction(token)

      if (result.success) {
        setSuccess(true)
        // Redirect to dashboard after a brief moment
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setError(result.error)
      }
    })
  }

  if (success) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Welcome to the team!</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirecting to dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <Button
        className="w-full"
        onClick={handleAccept}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4 animate-spin" />
            Accepting...
          </>
        ) : (
          "Accept Invitation"
        )}
      </Button>
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
