import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartLine } from "@phosphor-icons/react/dist/ssr"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Deep insights into your financial data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Burn Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                Chart coming soon
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                Chart coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ChartLine className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Analytics require data</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
            Connect a bank account and import transactions to unlock detailed analytics
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
