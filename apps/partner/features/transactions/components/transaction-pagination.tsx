"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@polso/ui/button"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"

interface TransactionPaginationProps {
  clientId: string
  currentPage: number
  totalPages: number
  total: number
  pageSize: number
}

export function TransactionPagination({
  clientId,
  currentPage,
  totalPages,
  total,
  pageSize,
}: TransactionPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const basePath = `/clients/${clientId}/transactions`

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`)
    })
  }

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {startItem}–{endItem} de {total} transacciones
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
        >
          <CaretLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
        >
          Siguiente
          <CaretRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
