import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface AlertFilters {
  type?: string
  severity?: string
  isRead?: boolean
}

export interface AlertWithRelations {
  id: string
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  isDismissed: boolean
  metadata: unknown
  createdAt: Date
  account: { id: string; name: string } | null
  expense: { id: string; description: string | null } | null
}

export interface AlertStats {
  total: number
  unread: number
  critical: number
}

export async function getAlerts(
  filters: AlertFilters = {},
  page = 1,
  pageSize = 25
): Promise<{ alerts: AlertWithRelations[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  const where: Record<string, unknown> = {
    organizationId,
    isDismissed: false,
  }

  if (filters.type) where.type = filters.type
  if (filters.severity) where.severity = filters.severity
  if (filters.isRead !== undefined) where.isRead = filters.isRead

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true },
        },
        expense: {
          select: { id: true, description: true },
        },
      },
      orderBy: [
        { severity: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alert.count({ where }),
  ])

  return {
    alerts: alerts as AlertWithRelations[],
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export async function getAlertStats(): Promise<AlertStats> {
  const { organizationId } = await getAuthContext()

  const baseWhere = { organizationId, isDismissed: false }

  const [total, unread, critical] = await Promise.all([
    prisma.alert.count({ where: baseWhere }),
    prisma.alert.count({ where: { ...baseWhere, isRead: false } }),
    prisma.alert.count({ where: { ...baseWhere, severity: "critical" } }),
  ])

  return { total, unread, critical }
}
