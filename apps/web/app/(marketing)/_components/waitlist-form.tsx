"use client"

import { useActionState } from "react"
import { Button } from "@polso/ui/button"
import { joinWaitlist } from "@/features/waitlist/actions/join-waitlist"
import { useTranslations } from "next-intl"

interface WaitlistFormProps {
  source?: string
}

export function WaitlistForm({ source = "hero" }: WaitlistFormProps) {
  const t = useTranslations("marketing")

  const [state, action, isPending] = useActionState(
    async (_prevState: { success: boolean; error?: string } | null, formData: FormData) => {
      formData.set("source", source)
      return joinWaitlist(formData)
    },
    null
  )

  if (state?.success) {
    return (
      <div className="mx-auto flex max-w-sm items-center justify-center gap-2 border bg-muted/50 px-4 py-3 text-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {t("waitlist.success")}
      </div>
    )
  }

  return (
    <form action={action} className="mx-auto flex max-w-sm flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        placeholder={t("waitlist.placeholder")}
        className="h-10 flex-1 border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        required
        disabled={isPending}
      />
      <Button type="submit" className="h-10" disabled={isPending}>
        {isPending ? t("waitlist.joining") : t("waitlist.joinWaitlist")}
      </Button>
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  )
}
