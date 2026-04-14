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
}

export async function getClientExports(
  partnerId: string,
  clientId: string
): Promise<ClientExport[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  return prisma.export.findMany({
    where: { organizationId: clientId, status: "completed" },
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
    },
  })
}
