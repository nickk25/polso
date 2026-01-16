import { Card, CardContent } from "@/components/ui/card"
import { Repeat } from "@phosphor-icons/react/dist/ssr"

export default function RecurringPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Recurring Expenses</h1>
        <p className="text-muted-foreground">
          Fixed expenses detected from your transaction patterns
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No recurring patterns detected</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
            Once you have enough transaction history, we&apos;ll automatically detect recurring expenses like subscriptions and bills
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
