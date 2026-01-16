import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Export, FileZip } from "@phosphor-icons/react/dist/ssr"

export default function ExportPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Export</h1>
          <p className="text-muted-foreground">
            Generate reports for your accountant
          </p>
        </div>
        <Button>
          <Export className="mr-2 h-4 w-4" />
          New Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Export Package</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a ZIP file containing:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>CSV file with all expenses</li>
              <li>PDF summary report</li>
              <li>All attached invoices</li>
            </ul>
            <Button className="mt-4">
              <Export className="mr-2 h-4 w-4" />
              Create Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <FileZip className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No exports yet
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
