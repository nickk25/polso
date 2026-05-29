"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Bank } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { ConnectBankDialog } from "./connect-bank-dialog"

interface ConnectBankButtonProps {
  size?: "default" | "sm" | "lg"
}

export function ConnectBankButton({ size = "lg" }: ConnectBankButtonProps) {
  const t = useTranslations("banking")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size={size} className="gap-2">
        <Bank className="h-5 w-5" />
        {t("connect.buttonLabel")}
      </Button>

      <ConnectBankDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
