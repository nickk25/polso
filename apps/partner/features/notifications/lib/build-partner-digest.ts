import { prisma } from "@/lib/db"
import { subDays, subHours } from "date-fns"

export interface DigestData {
  newClients: { id: string; name: string; connectedAt: Date }[]
  receiptsUploaded: { clientId: string; clientName: string; count: number }[]
  pendingReceipts: { clientId: string; clientName: string; count: number }[]
}

export async function buildPartnerDigest(
  partnerOrgId: string,
  cadence: "daily" | "weekly",
  now: Date
): Promise<DigestData> {
  const windowStart = cadence === "daily" ? subHours(now, 24) : subDays(now, 7)

  // Client IDs linked to this partner
  const activeLinks = await prisma.partnerClient.findMany({
    where: { partnerId: partnerOrgId, status: "active" },
    select: { clientId: true, client: { select: { name: true } }, connectedAt: true },
  })

  if (activeLinks.length === 0) {
    return { newClients: [], receiptsUploaded: [], pendingReceipts: [] }
  }

  const clientIds = activeLinks.map((l) => l.clientId)
  const clientNameById = Object.fromEntries(activeLinks.map((l) => [l.clientId, l.client.name]))

  // New clients connected in window
  const newClientLinks = activeLinks.filter((l) => l.connectedAt && l.connectedAt >= windowStart)
  const newClients = newClientLinks.map((l) => ({
    id: l.clientId,
    name: l.client.name,
    connectedAt: l.connectedAt!,
  }))

  // Receipts uploaded in window, grouped by client
  const uploadedRaw = await prisma.inboxItem.groupBy({
    by: ["organizationId"],
    where: {
      organizationId: { in: clientIds },
      createdAt: { gte: windowStart },
    },
    _count: { id: true },
  })

  const receiptsUploaded = uploadedRaw
    .map((r) => ({
      clientId: r.organizationId,
      clientName: clientNameById[r.organizationId] ?? r.organizationId,
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count)

  // Pending receipts now (same predicate as dashboard: status "new" or "no_match")
  const pendingRaw = await prisma.inboxItem.groupBy({
    by: ["organizationId"],
    where: {
      organizationId: { in: clientIds },
      status: { in: ["new", "no_match"] },
    },
    _count: { id: true },
  })

  const pendingReceipts = pendingRaw
    .filter((r) => r._count.id > 0)
    .map((r) => ({
      clientId: r.organizationId,
      clientName: clientNameById[r.organizationId] ?? r.organizationId,
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count)

  return { newClients, receiptsUploaded, pendingReceipts }
}
