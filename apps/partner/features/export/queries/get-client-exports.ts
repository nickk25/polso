import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface ClientExport {
  id: string
  name: string
  filePath: string
  startDate: Date
  endDate: Date
  expenseCount: number | null
  createdAt: Date
  generatedByName: string
}

export async function getClientExports(
  partnerId: string,
  clientId: string
): Promise<ClientExport[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  const exports = await prisma.export.findMany({
    where: {
      organizationId: clientId,
      status: "completed",
      // Include both old csv: records and new R2 ZIP exports (exclude apps/web R2 ZIPs via generatedByOrgId)
      OR: [
        { filePath: { startsWith: "csv:" } },
        { filePath: { startsWith: "exports/" }, generatedByOrgId: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      filePath: true,
      startDate: true,
      endDate: true,
      expenseCount: true,
      createdAt: true,
      generatedByOrgId: true,
    },
  })

  if (exports.length === 0) return []

  // Resolve generator org names
  const orgIds = [...new Set(exports.map((e) => e.generatedByOrgId).filter(Boolean) as string[])]
  const orgs = orgIds.length > 0
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      })
    : []
  const orgNameMap = new Map(orgs.map((o) => [o.id, o.name]))

  return exports.map((e) => ({
    ...e,
    generatedByName: e.generatedByOrgId
      ? (orgNameMap.get(e.generatedByOrgId) ?? "Desconocido")
      : "Desconocido",
  }))
}
