import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export interface CategoryWithCount {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
  expenseType: string | null
  isSystem: boolean
  parentId: string | null
  createdAt: Date
  _count: {
    expenses: number
  }
}

/**
 * Get system categories (available to all organizations)
 */
export async function getSystemCategories(): Promise<CategoryWithCount[]> {
  return prisma.category.findMany({
    where: {
      isSystem: true,
    },
    include: {
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Get custom categories for the current organization
 */
export async function getCustomCategories(): Promise<CategoryWithCount[]> {
  const { organizationId } = await getAuthContext()

  return prisma.category.findMany({
    where: {
      organizationId,
      isSystem: false,
    },
    include: {
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Get all categories (system + custom) for the current organization
 */
export async function getAllCategories(): Promise<CategoryWithCount[]> {
  const { organizationId } = await getAuthContext()

  return prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { organizationId },
      ],
    },
    include: {
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: [
      { isSystem: "desc" }, // System categories first
      { name: "asc" },
    ],
  })
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string) {
  const { organizationId } = await getAuthContext()

  return prisma.category.findFirst({
    where: {
      id,
      OR: [
        { isSystem: true },
        { organizationId },
      ],
    },
    include: {
      _count: {
        select: {
          expenses: true,
        },
      },
    },
  })
}
