import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface VendorWithStats {
  id: string
  name: string
  normalizedName: string
  logoUrl: string | null
  website: string | null
  taxId: string | null
  defaultCategoryId: string | null
  defaultExpenseType: string | null
  isAutoDetected: boolean
  detectionPatterns: string[]
  createdAt: Date
  defaultCategory: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    expenses: number
  }
  totalSpent: number
  lastExpenseDate: Date | null
}

/**
 * Get all vendors for the current organization with stats
 */
export async function getVendors(): Promise<VendorWithStats[]> {
  const { organizationId } = await getAuthContext()

  // Get vendors with expense count
  const vendors = await prisma.vendor.findMany({
    where: { organizationId },
    include: {
      defaultCategory: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Get aggregate stats for each vendor
  const vendorIds = vendors.map((v) => v.id)

  const statsResult = await prisma.expense.groupBy({
    by: ["vendorId"],
    where: {
      vendorId: { in: vendorIds },
    },
    _sum: {
      amount: true,
    },
    _max: {
      date: true,
    },
  })

  // Create a lookup map for stats
  const statsMap = new Map(
    statsResult.map((s) => [
      s.vendorId,
      {
        totalSpent: s._sum.amount || 0,
        lastExpenseDate: s._max.date,
      },
    ])
  )

  // Combine vendor data with stats
  return vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    normalizedName: vendor.normalizedName,
    logoUrl: vendor.logoUrl,
    website: vendor.website,
    taxId: vendor.taxId,
    defaultCategoryId: vendor.defaultCategoryId,
    defaultExpenseType: vendor.defaultExpenseType,
    isAutoDetected: vendor.isAutoDetected,
    detectionPatterns: vendor.detectionPatterns,
    createdAt: vendor.createdAt,
    defaultCategory: vendor.defaultCategory,
    _count: vendor._count,
    totalSpent: statsMap.get(vendor.id)?.totalSpent || 0,
    lastExpenseDate: statsMap.get(vendor.id)?.lastExpenseDate || null,
  }))
}

/**
 * Get a single vendor by ID with full details
 */
export async function getVendorById(id: string): Promise<VendorWithStats | null> {
  const { organizationId } = await getAuthContext()

  const vendor = await prisma.vendor.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      defaultCategory: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          expenses: true,
        },
      },
    },
  })

  if (!vendor) return null

  // Get aggregate stats for this vendor
  const stats = await prisma.expense.aggregate({
    where: {
      vendorId: vendor.id,
    },
    _sum: {
      amount: true,
    },
    _max: {
      date: true,
    },
  })

  return {
    id: vendor.id,
    name: vendor.name,
    normalizedName: vendor.normalizedName,
    logoUrl: vendor.logoUrl,
    website: vendor.website,
    taxId: vendor.taxId,
    defaultCategoryId: vendor.defaultCategoryId,
    defaultExpenseType: vendor.defaultExpenseType,
    isAutoDetected: vendor.isAutoDetected,
    detectionPatterns: vendor.detectionPatterns,
    createdAt: vendor.createdAt,
    defaultCategory: vendor.defaultCategory,
    _count: vendor._count,
    totalSpent: stats._sum.amount || 0,
    lastExpenseDate: stats._max.date || null,
  }
}
