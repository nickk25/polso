import { prisma } from "@polso/db"
import { extractReceiptData } from "@polso/agent/ocr"
import { findBestMatches } from "@polso/matching"

/**
 * Run OCR on a newly-uploaded InboxItem, update its extracted fields,
 * then find and persist the best matching transaction.
 *
 * Does NOT send WhatsApp/Telegram notifications — those are handled by the
 * webhook flows in apps/web which already have their own runMatchingForInboxItem.
 * Use this for vault, transaction-document, and partner uploads.
 */
export async function processInboxItem(
  organizationId: string,
  inboxItemId: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  try {
    const ocrData = await extractReceiptData(buffer, contentType)

    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: {
        displayName: ocrData.displayName,
        amount: ocrData.amount,
        currency: ocrData.currency ?? "EUR",
        date: ocrData.date ? new Date(ocrData.date) : null,
        cif: ocrData.cif,
        taxAmount: ocrData.vatAmount,
        taxRate: ocrData.vatRate,
        meta: ocrData as object,
      },
    })

    await runMatchingOnly(organizationId, inboxItemId)
  } catch (err) {
    console.error("[processInboxItem] error:", err)
    await prisma.inboxItem
      .update({ where: { id: inboxItemId }, data: { status: "no_match" } })
      .catch(() => {})
  }
}

async function runMatchingOnly(organizationId: string, inboxItemId: string): Promise<void> {
  const inboxItem = await prisma.inboxItem.findUnique({
    where: { id: inboxItemId },
    select: {
      id: true,
      amount: true,
      date: true,
      displayName: true,
      currency: true,
      cif: true,
    },
  })

  if (!inboxItem) return

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId,
      amount: { gt: 0 },
      date: { gte: since },
      transactionAttachments: { none: {} },
    },
    select: {
      id: true,
      amount: true,
      date: true,
      merchantName: true,
      name: true,
      currency: true,
    },
  })

  if (transactions.length === 0) {
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    })
    return
  }

  const candidates = transactions.map((tx) => ({
    transactionId: tx.id,
    transactionAmount: tx.amount,
    transactionDate: tx.date,
    transactionName: tx.merchantName ?? tx.name,
    transactionCurrency: tx.currency,
    inboxItemId: inboxItem.id,
    inboxAmount: inboxItem.amount ? Number(inboxItem.amount) : null,
    inboxDate: inboxItem.date,
    inboxDisplayName: inboxItem.displayName,
    inboxCurrency: inboxItem.currency,
    inboxCif: inboxItem.cif ?? null,
  }))

  const results = findBestMatches(candidates)

  if (results.length === 0) {
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    })
    return
  }

  const best = results[0]!
  const isAuto = best.matchType === "auto_matched"

  await prisma.matchSuggestion.upsert({
    where: {
      transactionId_inboxItemId: {
        transactionId: best.transactionId,
        inboxItemId: inboxItem.id,
      },
    },
    update: {},
    create: {
      organizationId,
      transactionId: best.transactionId,
      inboxItemId: inboxItem.id,
      confidenceScore: best.scores.confidenceScore,
      amountScore: best.scores.amountScore,
      dateScore: best.scores.dateScore,
      nameScore: best.scores.nameScore,
      currencyScore: best.scores.currencyScore,
      matchType: best.matchType,
      status: isAuto ? "confirmed" : "pending",
    },
  })

  if (isAuto) {
    await Promise.all([
      prisma.transactionAttachment.upsert({
        where: {
          transactionId_inboxItemId: {
            transactionId: best.transactionId,
            inboxItemId: inboxItem.id,
          },
        },
        update: {},
        create: { transactionId: best.transactionId, inboxItemId: inboxItem.id },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId: best.transactionId },
      }),
      prisma.entry.updateMany({
        where: { transactionId: best.transactionId, organizationId },
        data: { status: "verified" },
      }),
    ])
  } else {
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "suggested_match" },
    })
  }
}
