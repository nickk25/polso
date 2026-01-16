import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Receipt } from "@phosphor-icons/react/dist/ssr"

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground">
            Track and categorize your expenses
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No expenses yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
            Connect a bank account to automatically import transactions, or add expenses manually
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add your first expense
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
