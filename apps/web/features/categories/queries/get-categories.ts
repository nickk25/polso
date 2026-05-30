import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface CategoryWithCount {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
  entryType: string | null
  isSystem: boolean
  parentId: string | null
  createdAt: Date
  isHidden: boolean
  _count: {
    entries: number
  }
}

async function attachHiddenState(
  categories: Omit<CategoryWithCount, "isHidden">[],
  organizationId: string
): Promise<CategoryWithCount[]> {
  if (categories.length === 0) return []

  const prefs = await prisma.categoryPreference.findMany({
    where: {
      organizationId,
      categoryId: { in: categories.map((c) => c.id) },
      isHidden: true,
    },
    select: { categoryId: true },
  })

  const hiddenSet = new Set(prefs.map((p) => p.categoryId))

  return categories.map((c) => ({ ...c, isHidden: hiddenSet.has(c.id) }))
}

export async function getSystemCategories(): Promise<CategoryWithCount[]> {
  const { organizationId } = await getAuthContext()

  const categories = await prisma.category.findMany({
    where: { isSystem: true },
    include: { _count: { select: { entries: true } } },
    orderBy: { name: "asc" },
  })

  return attachHiddenState(categories, organizationId)
}

export async function getCustomCategories(): Promise<CategoryWithCount[]> {
  const { organizationId } = await getAuthContext()

  const categories = await prisma.category.findMany({
    where: { organizationId, isSystem: false },
    include: { _count: { select: { entries: true } } },
    orderBy: { name: "asc" },
  })

  return attachHiddenState(categories, organizationId)
}

export async function getAllCategories(): Promise<CategoryWithCount[]> {
  const { organizationId } = await getAuthContext()

  const categories = await prisma.category.findMany({
    where: { OR: [{ isSystem: true }, { organizationId }] },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })

  return attachHiddenState(categories, organizationId)
}

export async function getActiveCategories(): Promise<CategoryWithCount[]> {
  const all = await getAllCategories()
  return all.filter((c) => !c.isHidden)
}

export async function getCategoryById(id: string) {
  const { organizationId } = await getAuthContext()

  return prisma.category.findFirst({
    where: {
      id,
      OR: [{ isSystem: true }, { organizationId }],
    },
    include: { _count: { select: { entries: true } } },
  })
}
