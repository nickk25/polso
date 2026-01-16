import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Tag } from "@phosphor-icons/react/dist/ssr"
import { Badge } from "@/components/ui/badge"

const systemCategories = [
  { name: "Rent & Mortgage", type: "fixed", color: "#EF4444" },
  { name: "Utilities", type: "fixed", color: "#F59E0B" },
  { name: "Insurance", type: "fixed", color: "#3B82F6" },
  { name: "Subscriptions", type: "fixed", color: "#8B5CF6" },
  { name: "Salaries", type: "fixed", color: "#14B8A6" },
  { name: "Food & Dining", type: "variable", color: "#F97316" },
  { name: "Transportation", type: "variable", color: "#06B6D4" },
  { name: "Shopping", type: "variable", color: "#A855F7" },
  { name: "Marketing", type: "variable", color: "#F43F5E" },
  { name: "Software & Tools", type: "variable", color: "#6366F1" },
]

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-muted-foreground">
            Manage expense categories
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {systemCategories.map((category) => (
              <div
                key={category.name}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 text-sm font-medium">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Tag className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No custom categories yet
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
