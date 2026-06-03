import { persistMatchResult } from "@polso/inbox"

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MatchInboxRef {
  id: string
  waSenderId: string | null
  tgChatId: string | null
  displayName: string | null
  /** Prisma Decimal or number — use Number() to convert */
  taxAmount: { toNumber(): number } | number | null
  taxRate: number | null
}

export interface MatchTxRef {
  id: string
  merchantName: string | null
  name: string | null
  amount: number
  currency: string
  date: Date
}

export interface MatchScores {
  confidenceScore: number
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
}

// ─── Persist match ────────────────────────────────────────────────────────────

export async function persistMatch(
  organizationId: string,
  tx: MatchTxRef,
  inboxItem: MatchInboxRef,
  scores: MatchScores,
  matchType: "auto_matched" | "high_confidence" | "suggested"
): Promise<void> {
  await persistMatchResult(organizationId, tx, {
    id: inboxItem.id,
    displayName: inboxItem.displayName,
    waSenderId: inboxItem.waSenderId,
    tgChatId: inboxItem.tgChatId,
    taxAmount: inboxItem.taxAmount != null ? Number(inboxItem.taxAmount) : null,
    taxRate: inboxItem.taxRate,
  }, scores, matchType)
}
