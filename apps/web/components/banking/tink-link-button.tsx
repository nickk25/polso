"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Bank, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { toast } from "sonner"

interface TinkLinkButtonProps {
  onRedirecting?: () => void
}

/**
 * Tink Link button — fetches a Tink Link URL and redirects the user.
 * On return from Tink, the callback route (/api/tink/callback) handles
 * token exchange and account creation, then redirects to /settings/banking.
 */
export function TinkLinkButton({ onRedirecting }: TinkLinkButtonProps) {
  const t = useTranslations("banking")
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    onRedirecting?.()

    try {
      const response = await fetch("/api/tink/create-link-url", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create bank connection URL")
      }

      // Redirect to Tink Link — user will return to /api/tink/callback
      window.location.href = data.url as string
    } catch (error) {
      console.error("Error starting Tink Link:", error)
      toast.error(error instanceof Error ? error.message : t("tink.error"))
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size="lg"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Spinner className="h-5 w-5 animate-spin" />
          {t("tink.connecting")}
        </>
      ) : (
        <>
          <Bank className="h-5 w-5" />
          {t("tink.connectBankAccount")}
        </>
      )}
    </Button>
  )
}
