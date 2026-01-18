"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Export } from "@phosphor-icons/react"
import { ExportDialog } from "./export-dialog"

export function NewExportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Export className="mr-2 h-4 w-4" />
        New Export
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
