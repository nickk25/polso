import { MappedTransaction, JournalLine } from "./types"
import { resolveAccountCode, PGC_BANK, PGC_VAT_INPUT, PGC_VAT_OUTPUT, PGC_INCOME } from "./pgc-defaults"

const EPSILON = 0.005

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function validate(lines: JournalLine[], tx: MappedTransaction): void {
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0))
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0))
  if (Math.abs(totalDebit - totalCredit) > EPSILON) {
    throw new Error(
      `Asiento descuadrado para tx ${tx.id}: debe=${totalDebit} haber=${totalCredit}`
    )
  }
}

function shortDescription(tx: MappedTransaction): string {
  const raw = tx.counterpartyName ?? tx.description ?? ""
  return raw.substring(0, 30)
}

export function convertToJournalLines(
  transactions: MappedTransaction[],
  categorySlugMap?: Record<string, string>
): JournalLine[] {
  const result: JournalLine[] = []
  let journalId = 1

  for (const tx of transactions) {
    const slug = categorySlugMap?.[tx.id] ?? null
    const expenseAccount = resolveAccountCode(tx.categoryAccountCode, slug)
    const desc = shortDescription(tx)
    const docRef = tx.documentRef ?? tx.id.substring(0, 10)
    const base = tx.taxAmount != null && tx.taxRate
      ? round2(tx.amount - tx.taxAmount)
      : tx.amount

    if (tx.direction === "expense") {
      const lines: JournalLine[] = []

      // Line 1: expense account DEBE (base)
      lines.push({
        journalId,
        date: tx.date,
        account: expenseAccount,
        counterAccount: PGC_BANK,
        debit: base,
        credit: 0,
        description: desc,
        documentRef: docRef,
        invoiceNumber: tx.documentRef,
        counterpartyTaxId: tx.counterpartyTaxId,
        taxBase: base,
        taxRate: tx.taxRate,
        taxAmount: tx.taxAmount,
      })

      // Line 2: 472 IVA soportado DEBE (only if taxAmount > 0)
      if (tx.taxAmount && tx.taxAmount > 0) {
        lines.push({
          journalId,
          date: tx.date,
          account: PGC_VAT_INPUT,
          counterAccount: PGC_BANK,
          debit: round2(tx.taxAmount),
          credit: 0,
          description: `IVA ${Math.round((tx.taxRate ?? 0) * 100)}%`,
          documentRef: docRef,
          invoiceNumber: tx.documentRef,
          counterpartyTaxId: tx.counterpartyTaxId,
          taxBase: null,
          taxRate: null,
          taxAmount: null,
        })
      }

      // Line 3: 572 Bancos HABER (full amount)
      lines.push({
        journalId,
        date: tx.date,
        account: PGC_BANK,
        counterAccount: expenseAccount,
        debit: 0,
        credit: round2(tx.amount),
        description: desc,
        documentRef: docRef,
        invoiceNumber: tx.documentRef,
        counterpartyTaxId: tx.counterpartyTaxId,
        taxBase: null,
        taxRate: null,
        taxAmount: null,
      })

      validate(lines, tx)
      result.push(...lines)
    } else {
      // Income: 572 Bancos DEBE / 477 IVA repercutido HABER / 705 Ingresos HABER
      const lines: JournalLine[] = []

      // Line 1: 572 Bancos DEBE (full amount received)
      lines.push({
        journalId,
        date: tx.date,
        account: PGC_BANK,
        counterAccount: PGC_INCOME,
        debit: round2(tx.amount),
        credit: 0,
        description: desc,
        documentRef: docRef,
        invoiceNumber: tx.documentRef,
        counterpartyTaxId: tx.counterpartyTaxId,
        taxBase: null,
        taxRate: null,
        taxAmount: null,
      })

      // Line 2: 705 Ingresos HABER (base)
      lines.push({
        journalId,
        date: tx.date,
        account: PGC_INCOME,
        counterAccount: PGC_BANK,
        debit: 0,
        credit: base,
        description: desc,
        documentRef: docRef,
        invoiceNumber: tx.documentRef,
        counterpartyTaxId: tx.counterpartyTaxId,
        taxBase: base,
        taxRate: tx.taxRate,
        taxAmount: tx.taxAmount,
      })

      // Line 3: 477 IVA repercutido HABER (only if taxAmount > 0)
      if (tx.taxAmount && tx.taxAmount > 0) {
        lines.push({
          journalId,
          date: tx.date,
          account: PGC_VAT_OUTPUT,
          counterAccount: PGC_BANK,
          debit: 0,
          credit: round2(tx.taxAmount),
          description: `IVA ${Math.round((tx.taxRate ?? 0) * 100)}%`,
          documentRef: docRef,
          invoiceNumber: tx.documentRef,
          counterpartyTaxId: tx.counterpartyTaxId,
          taxBase: null,
          taxRate: null,
          taxAmount: null,
        })
      }

      validate(lines, tx)
      result.push(...lines)
    }

    journalId++
  }

  return result
}
