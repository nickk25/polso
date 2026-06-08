export interface MappedTransaction {
  id: string
  amount: number
  direction: "expense" | "income"
  currency: string
  date: Date
  description: string
  counterpartyName: string | null
  counterpartyTaxId: string | null
  categoryAccountCode: string | null
  taxRate: number | null
  taxAmount: number | null
  documentRef: string | null
}

export interface JournalLine {
  journalId: number
  date: Date
  account: string
  counterAccount: string
  debit: number
  credit: number
  description: string
  documentRef: string
  invoiceNumber: string | null
  counterpartyTaxId: string | null
  taxBase: number | null
  taxRate: number | null
  taxAmount: number | null
}

export interface AccountingProvider {
  id: "a3" | "sage"
  name: string
  generate(lines: JournalLine[], opts: { separator: string }): string
}
