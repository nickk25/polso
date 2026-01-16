"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"

interface IncomePaginationProps {
  currentPage: number
  totalPages: number
  total: number
}

export function IncomePagination({ currentPage, totalPages, total }: IncomePaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    startTransition(() => {
      router.push(`/income?${params.toString()}`)
    })
  }

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * 25 + 1
  const endItem = Math.min(currentPage * 25, total)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
        >
          <CaretLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
        >
          Next
          <CaretRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
