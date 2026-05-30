import type { Prisma } from "./generated/prisma/client"

/**
 * Canonical Prisma where input for transactions that have been documented.
 * A transaction is documented when its entry is verified OR it has an inbox item.
 */
export const transactionDocumentedWhere = {
  OR: [
    { entry: { status: "verified" } },
    { inboxItems: { some: {} } },
  ],
} satisfies Prisma.TransactionWhereInput

/**
 * Inverse of transactionDocumentedWhere — transactions that still need a receipt.
 */
export const transactionNotDocumentedWhere = {
  NOT: transactionDocumentedWhere,
} satisfies Prisma.TransactionWhereInput
