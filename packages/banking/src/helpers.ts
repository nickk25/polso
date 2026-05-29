import type { BankTransaction } from "./types"

/**
 * Determine transaction type from normalized Polso amount.
 * Polso convention: positive = expense (debit), negative = income (credit).
 */
export function getTransactionType(amount: number): "debit" | "credit" {
  return amount > 0 ? "debit" : "credit"
}

/**
 * Detect income source from a GoCardless transaction.
 * Infers from category (proprietaryBankTransactionCode) and name patterns.
 */
export function detectIncomeSource(tx: BankTransaction): string {
  const category = (tx.category ?? "").toLowerCase()
  const name = (tx.name ?? "").toLowerCase()
  const merchantName = (tx.merchantName ?? "").toLowerCase()

  // Salary / payroll
  if (
    category.includes("payroll") ||
    category.includes("salary") ||
    name.includes("nomina") ||
    name.includes("salario") ||
    name.includes("salary") ||
    merchantName.includes("nomina")
  ) {
    return "salary"
  }

  // Investment returns
  if (
    name.includes("dividend") ||
    name.includes("interest") ||
    name.includes("dividendo") ||
    name.includes("interes") ||
    name.includes("rendimiento")
  ) {
    return "investment"
  }

  // Refunds
  if (
    name.includes("refund") ||
    name.includes("devolucion") ||
    name.includes("reembolso") ||
    name.includes("devol")
  ) {
    return "refund"
  }

  // Transfers / Bizum
  if (
    category.includes("transfer") ||
    name.includes("transferencia") ||
    name.includes("bizum") ||
    name.includes("transfer")
  ) {
    return "transfer"
  }

  return "other"
}
