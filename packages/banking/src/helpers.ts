import type { BankTransaction } from "./types"

/**
 * Determine transaction type from normalized Polso amount.
 * Polso convention: positive = expense (debit), negative = income (credit).
 */
export function getTransactionType(amount: number): "debit" | "credit" {
  return amount > 0 ? "debit" : "credit"
}

/**
 * Detect income source from a Tink transaction.
 *
 * Tink doesn't provide the same detailed personal_finance_category as Plaid,
 * so we infer from available signals: category type and display name patterns.
 */
export function detectIncomeSource(tx: BankTransaction): string {
  const category = (tx.category ?? "").toUpperCase()
  const name = (tx.name ?? "").toLowerCase()
  const merchantName = (tx.merchantName ?? "").toLowerCase()

  // Salary / payroll patterns
  if (
    category.includes("SALARY") ||
    category.includes("PAYROLL") ||
    name.includes("nomina") ||
    name.includes("salario") ||
    name.includes("salary") ||
    merchantName.includes("nomina")
  ) {
    return "salary"
  }

  // Investment returns
  if (
    category.includes("DIVIDEND") ||
    category.includes("INTEREST") ||
    category.includes("INVESTMENT") ||
    name.includes("dividendo") ||
    name.includes("interes") ||
    name.includes("rendimiento")
  ) {
    return "investment"
  }

  // Refunds
  if (
    category.includes("REFUND") ||
    name.includes("devolucion") ||
    name.includes("reembolso") ||
    name.includes("refund") ||
    name.includes("devol")
  ) {
    return "refund"
  }

  // Transfers
  if (
    category.includes("TRANSFER") ||
    name.includes("transferencia") ||
    name.includes("bizum") ||
    name.includes("transfer")
  ) {
    return "transfer"
  }

  return "other"
}
