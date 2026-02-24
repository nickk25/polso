"use client"

import { useState, useCallback } from "react"
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Bank, Spinner } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PlaidLinkButtonProps {
  linkToken: string | null
  onSuccess?: () => void
}

export function PlaidLinkButton({ linkToken, onSuccess }: PlaidLinkButtonProps) {
  const router = useRouter()
  const t = useTranslations("banking")
  const [isExchanging, setIsExchanging] = useState(false)

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setIsExchanging(true)

      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicToken,
            institutionId: metadata.institution?.institution_id || "",
            institutionName: metadata.institution?.name || "Unknown Bank",
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to connect bank account")
        }

        onSuccess?.()
        toast.success(t("sync.success"))
        router.push("/settings/banking")
        router.refresh()
      } catch (error) {
        console.error("Error exchanging token:", error)
        toast.error(error instanceof Error ? error.message : t("sync.error"))
      } finally {
        setIsExchanging(false)
      }
    },
    [onSuccess, router, t]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (error) => {
      if (error) {
        console.error("Plaid Link exit with error:", error)
      }
    },
  })

  const handleClick = () => {
    if (!linkToken) return
    open()
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || !linkToken || isExchanging}
      size="lg"
      className="gap-2"
    >
      {isExchanging ? (
        <>
          <Spinner className="h-5 w-5 animate-spin" />
          {t("plaid.connecting")}
        </>
      ) : (
        <>
          <Bank className="h-5 w-5" />
          {t("plaid.connectBankAccount")}
        </>
      )}
    </Button>
  )
}
