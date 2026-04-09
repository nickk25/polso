"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MagnifyingGlass, Spinner } from "@phosphor-icons/react"
import { detectPatternsAction } from "../actions/detect-patterns"
import { useTranslations } from "next-intl"

export function DetectPatternsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations("recurring")

  const handleDetect = async () => {
    setLoading(true)
    await detectPatternsAction()
    setLoading(false)
    router.refresh()
  }

  return (
    <Button onClick={handleDetect} disabled={loading}>
      {loading ? (
        <>
          <Spinner className="h-4 w-4 mr-2 animate-spin" />
          {t("analyzing")}
        </>
      ) : (
        <>
          <MagnifyingGlass className="h-4 w-4 mr-2" />
          {t("detectPatterns")}
        </>
      )}
    </Button>
  )
}
