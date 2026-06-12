"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import { toast } from "@polso/ui/sonner"
import { recordConsentAction } from "@/features/auth/actions/record-consent"

interface ConsentStepProps {
  heading: string
  subheading: string
  label: string
  terms: string
  privacy: string
  required: string
  accept: string
  termsHref?: string
  privacyHref?: string
}

export function ConsentStep({
  heading,
  subheading,
  label,
  terms,
  privacy,
  required,
  accept,
  termsHref = "/terms",
  privacyHref = "/privacy",
}: ConsentStepProps) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) { setError(required); return }
    setLoading(true)
    try {
      await recordConsentAction()
      router.push("/onboarding")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving consent")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="text-muted-foreground">{subheading}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <Checkbox
            id="consent"
            checked={accepted}
            onCheckedChange={(v) => { setAccepted(!!v); setError(null) }}
            disabled={loading}
          />
          {/* Separate the label text from the links to avoid the label-click toggling the checkbox */}
          <div className="text-sm text-muted-foreground leading-relaxed">
            <label htmlFor="consent" className="cursor-pointer">
              {label}{" "}
            </label>
            <a href={termsHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {terms}
            </a>
            {" "}y{" "}
            <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {privacy}
            </a>
          </div>
        </div>
        {error && <p className="text-xs text-destructive pl-6">{error}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {accept}
      </Button>
    </form>
  )
}
