"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MagnifyingGlass, Sparkle, GitMerge } from "@phosphor-icons/react"
import type { ClientWithStats } from "../queries/get-clients"

interface ClientTableProps {
  clients: ClientWithStats[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onClientClick: (client: ClientWithStats) => void
  onMergeClick: () => void
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ClientTable({
  clients,
  selectedIds,
  onSelectionChange,
  onClientClick,
  onMergeClick,
}: ClientTableProps) {
  const t = useTranslations("clients")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.length > 0) {
        onSelectionChange([])
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds.length, onSelectionChange])

  // Filter clients by search
  const filteredClients = clients.filter((client) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.normalizedName.toLowerCase().includes(searchLower) ||
      client.defaultCategory?.name.toLowerCase().includes(searchLower)
    )
  })

  const allSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedIds.includes(c.id))

  const someSelected =
    filteredClients.some((c) => selectedIds.includes(c.id)) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredClients.map((c) => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (clientId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, clientId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== clientId))
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("table.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.length >= 2 && (
          <Button variant="outline" size="sm" onClick={onMergeClick}>
            <GitMerge className="h-4 w-4 mr-2" />
            {t("table.mergeSelected", { count: selectedIds.length })}
          </Button>
        )}
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>{t("table.client")}</TableHead>
            <TableHead>{t("table.defaultCategory")}</TableHead>
            <TableHead className="text-right">{t("table.incomes")}</TableHead>
            <TableHead className="text-right">{t("table.totalReceived")}</TableHead>
            <TableHead>{t("table.lastIncome")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {search ? t("table.noMatch") : t("table.noClients")}
              </TableCell>
            </TableRow>
          ) : (
            filteredClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onClientClick(client)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(client.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(client.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{client.name}</span>
                    {client.isAutoDetected && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkle
                            weight="fill"
                            className="h-3 w-3 text-violet-500"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("table.autoDetected")}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {client.defaultCategory ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: client.defaultCategory.color }}
                      />
                      <span>{client.defaultCategory.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {client._count.incomes}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(client.totalReceived)}
                </TableCell>
                <TableCell>
                  {client.lastIncomeDate ? (
                    format(new Date(client.lastIncomeDate), "MMM d, yyyy")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
