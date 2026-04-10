"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import { Export } from "@phosphor-icons/react"
import { ExportDialog } from "./export-dialog"
import { useTranslations } from "next-intl"

export function NewExportButton() {
  const [open, setOpen] = useState(false)
  const t = useTranslations("export")

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Export className="mr-2 h-4 w-4" />
        {t("newExport")}
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
