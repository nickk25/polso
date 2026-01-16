import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Buildings } from "@phosphor-icons/react/dist/ssr"

export default function VendorsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-muted-foreground">
            Manage suppliers and set default categories
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Buildings className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No vendors yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
            Vendors are automatically detected from transactions, or you can add them manually
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
