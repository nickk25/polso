import { CategoriesPageContent } from "@/features/categories/components/categories-page-content"
import { getSystemCategories, getCustomCategories } from "@/features/categories/queries/get-categories"

export default async function CategoriesPage() {
  const [systemCategories, customCategories] = await Promise.all([
    getSystemCategories(),
    getCustomCategories(),
  ])

  return (
    <CategoriesPageContent
      systemCategories={systemCategories}
      customCategories={customCategories}
    />
  )
}
