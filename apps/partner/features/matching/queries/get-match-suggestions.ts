import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface MatchSuggestionWithDetails {
  id: string
  transactionId: string
  inboxItemId: string
  confidenceScore: number
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
  matchType: string
  status: string
  transaction: {
    date: Date
    name: string | null
    merchantName: string | null
    amount: number
    currency: string
  }
  inboxItem: {
    id: string
    fileName: string
    displayName: string | null
    amount: unknown
    currency: string
    date: Date | null
    taxAmount: unknown
    taxRate: number | null
  }
}

export async function getMatchSuggestions(
  partnerId: string,
  clientId: string
): Promise<MatchSuggestionWithDetails[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })

  if (!link) notFound()

  return prisma.matchSuggestion.findMany({
    where: {
      organizationId: clientId,
      status: "pending",
    },
    orderBy: { confidenceScore: "desc" },
    select: {
      id: true,
      transactionId: true,
      inboxItemId: true,
      confidenceScore: true,
      amountScore: true,
      dateScore: true,
      nameScore: true,
      currencyScore: true,
      matchType: true,
      status: true,
      transaction: {
        select: {
          date: true,
          name: true,
          merchantName: true,
          amount: true,
          currency: true,
        },
      },
      inboxItem: {
        select: {
          id: true,
          fileName: true,
          displayName: true,
          amount: true,
          currency: true,
          date: true,
          taxAmount: true,
          taxRate: true,
        },
      },
    },
  })
}
