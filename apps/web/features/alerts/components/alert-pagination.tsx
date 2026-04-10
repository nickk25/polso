"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"

interface AlertPaginationProps {
  currentPage: number
  totalPages: number
  total: number
  pageSize: number
}

export function AlertPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
}: AlertPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("alerts")

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    startTransition(() => {
      router.push(`/alerts?${params.toString()}`)
    })
  }

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {t("pagination.showing", { start: startItem, end: endItem, total })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
        >
          <CaretLeft className="h-4 w-4 mr-1" />
          {t("pagination.previous")}
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {t("pagination.page", { current: currentPage, total: totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
        >
          {t("pagination.next")}
          <CaretRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
