import { Prisma } from "@polso/db"

export interface MergeCounterpartiesCoreInput {
  organizationId: string
  sourceIds: string[]
  targetId: string
}

export interface MergeCounterpartiesCoreResult {
  mergedId: string
  entriesReassigned: number
  patternsReassigned: number
  dismissedReassigned: number
  deletedCount: number
}

/**
 * Pure merge logic, runnable inside any Prisma transaction — no request session.
 * Reused by `mergeCounterpartiesAction` (Server Action wrapper) and the backfill
 * migration script, which cannot call a Server Action (`getAuthContext` throws
 * outside a request).
 *
 * Reassigns Entry, RecurringPattern AND DismissedPattern from sources to target,
 * unions detection patterns, then deletes the source counterparties.
 *
 * Throws on validation failure; callers convert to their own error shape.
 */
export async function mergeCounterpartiesCore(
  tx: Prisma.TransactionClient,
  { organizationId, sourceIds, targetId }: MergeCounterpartiesCoreInput
): Promise<MergeCounterpartiesCoreResult> {
  if (!sourceIds || sourceIds.length === 0) {
    throw new Error("At least one source counterparty is required")
  }
  if (!targetId) {
    throw new Error("Target counterparty is required")
  }
  if (sourceIds.includes(targetId)) {
    throw new Error("Target cannot be in the source list")
  }

  const counterparties = await tx.counterparty.findMany({
    where: { organizationId, id: { in: [...sourceIds, targetId] } },
    select: { id: true, detectionPatterns: true },
  })

  if (counterparties.length !== sourceIds.length + 1) {
    throw new Error("One or more counterparties not found")
  }

  const targetCp = counterparties.find((c) => c.id === targetId)
  if (!targetCp) throw new Error("Target counterparty not found")

  const entriesUpdate = await tx.entry.updateMany({
    where: { counterpartyId: { in: sourceIds } },
    data: { counterpartyId: targetId },
  })

  const patternsUpdate = await tx.recurringPattern.updateMany({
    where: { counterpartyId: { in: sourceIds } },
    data: { counterpartyId: targetId },
  })

  // Reassign dismissed patterns too — otherwise `deleteMany` below nulls their
  // counterpartyId (onDelete: SetNull) and detection silently resurfaces them.
  const dismissedUpdate = await tx.dismissedPattern.updateMany({
    where: { counterpartyId: { in: sourceIds } },
    data: { counterpartyId: targetId },
  })

  const sourceCps = counterparties.filter((c) => sourceIds.includes(c.id))
  const allPatterns = new Set([
    ...targetCp.detectionPatterns,
    ...sourceCps.flatMap((c) => c.detectionPatterns),
  ])

  await tx.counterparty.update({
    where: { id: targetId },
    data: { detectionPatterns: Array.from(allPatterns) },
  })

  await tx.counterparty.deleteMany({
    where: { id: { in: sourceIds } },
  })

  return {
    mergedId: targetId,
    entriesReassigned: entriesUpdate.count,
    patternsReassigned: patternsUpdate.count,
    dismissedReassigned: dismissedUpdate.count,
    deletedCount: sourceIds.length,
  }
}
