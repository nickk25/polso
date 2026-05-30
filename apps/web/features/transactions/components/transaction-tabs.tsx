"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface TransactionTabsProps {
  tab: "expenses" | "income"
}

export function TransactionTabs({ tab }: TransactionTabsProps) {
  return (
    <div className="flex items-center gap-1 -mt-2">
      <Link
        href="/transactions"
        className={cn(
          "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
          tab === "expenses"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Expenses
      </Link>
      <Link
        href="/transactions?tab=income"
        className={cn(
          "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
          tab === "income"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Income
      </Link>
    </div>
  )
}
