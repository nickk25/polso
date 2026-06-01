"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Spinner, MagnifyingGlass } from "@phosphor-icons/react"
import { Input } from "@polso/ui/input"
import { Button } from "@polso/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import {
  searchTransactionsForMatchAction,
  type TransactionSearchResult,
} from "@/features/inbox/actions/vault-actions"

interface VaultTransactionPickerProps {
  onSelect: (tx: TransactionSearchResult) => void
  onCancel: () => void
  disabled?: boolean
}

export function VaultTransactionPicker({
  onSelect,
  onCancel,
  disabled = false,
}: VaultTransactionPickerProps) {
  const t = useTranslations("vault")
  const tc = useTranslations("common")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TransactionSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const result = await searchTransactionsForMatchAction(query.trim())
        if (result.success) setResults(result.data.transactions)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("sheet.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          autoFocus
        />
        {searching && (
          <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1 rounded-md border bg-background">
        {results.length === 0 && query.trim().length >= 2 && !searching ? (
          <p className="p-3 text-sm text-muted-foreground text-center">
            {t("sheet.searchNoResults")}
          </p>
        ) : results.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground text-center">
            {t("sheet.searchHint")}
          </p>
        ) : (
          results.map((tx) => (
            <button
              key={tx.id}
              type="button"
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted transition-colors text-sm"
              onClick={() => onSelect(tx)}
              disabled={disabled}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {tx.merchantName ?? tx.description ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM d, yyyy")}
                </p>
              </div>
              <span className="text-sm font-medium ml-3 shrink-0">
                {formatCurrency(tx.amount, tx.currency)}
              </span>
            </button>
          ))
        )}
      </div>

      <Button variant="outline" size="sm" onClick={onCancel} disabled={disabled} className="w-full">
        {tc("actions.cancel")}
      </Button>
    </div>
  )
}
