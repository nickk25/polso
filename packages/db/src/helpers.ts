import type { Prisma } from "./generated/prisma/client"

/**
 * Canonical Prisma where input for transactions that have been documented.
 * A transaction is documented when its expense is marked "documented" OR
 * it has at least one inbox item (receipt) confirmed against it.
 */
export const transactionDocumentedWhere = {
  OR: [
    { expense: { status: "documented" } },
    { inboxItems: { some: {} } },
  ],
} satisfies Prisma.TransactionWhereInput

/**
 * Inverse of transactionDocumentedWhere — transactions that still need a receipt.
 */
export const transactionNotDocumentedWhere = {
  NOT: transactionDocumentedWhere,
} satisfies Prisma.TransactionWhereInput
