import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Receipt, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getExpenses, getExpenseStats } from "@/features/expenses/queries/get-expenses"
import { format } from "date-fns"
import Link from "next/link"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

function getStatusBadge(status: string) {
  switch (status) {
    case "documented":
      return <Badge variant="default">Documented</Badge>
    case "excluded":
      return <Badge variant="secondary">Excluded</Badge>
    case "pending":
    default:
      return <Badge variant="outline">Pending</Badge>
  }
}

function getExpenseTypeBadge(type: string) {
  switch (type) {
    case "fixed":
      return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Fixed</Badge>
    case "variable":
    default:
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Variable</Badge>
  }
}

export default async function ExpensesPage() {
  const [{ expenses, total }, stats] = await Promise.all([
    getExpenses({}, 1, 50),
    getExpenseStats(),
  ])

  const hasExpenses = expenses.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground">
            {total > 0
              ? `${total} transaction${total > 1 ? "s" : ""} this month`
              : "Track and categorize your expenses"}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      {hasExpenses && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalThisMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalLastMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fixed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(stats.fixedThisMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Variable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {formatCurrency(stats.variableThisMonth)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expenses Table */}
      {hasExpenses ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {expense.vendor?.name ||
                            expense.transaction?.merchantName ||
                            expense.transaction?.name ||
                            expense.description ||
                            "Unknown"}
                        </span>
                        {expense.transaction?.category && (
                          <span className="text-xs text-muted-foreground">
                            {expense.transaction.category}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.category ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: expense.category.color }}
                          />
                          <span>{expense.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getExpenseTypeBadge(expense.expenseType)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > 50 && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm">
                  Load more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No expenses yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              Connect a bank account to automatically import transactions, or add
              expenses manually
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" asChild>
                <Link href="/banking">
                  Connect Bank
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
