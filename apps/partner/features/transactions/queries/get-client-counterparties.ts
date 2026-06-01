import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface ClientCounterparty {
  id: string
  name: string
  logoUrl: string | null
}

export async function getClientCounterparties(
  partnerId: string,
  clientId: string,
): Promise<ClientCounterparty[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  return prisma.counterparty.findMany({
    where: { organizationId: clientId },
    select: { id: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  })
}
