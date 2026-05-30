import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface ExpenseForPDF {
  date: Date
  amount: number
  currency: string
  description: string | null
  entryType: "fixed" | "variable" | null
  counterparty: {
    name: string
  } | null
  category: {
    name: string
  } | null
  documents: { id: string }[]
}

export interface PDFGeneratorInput {
  organizationName: string
  startDate: Date
  endDate: Date
  expenses: ExpenseForPDF[]
  totals: {
    total: number
    fixed: number
    variable: number
    currency: string
    byCategory: { name: string; amount: number; color: string }[]
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

function formatDate(date: Date): string {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export async function generatePDF(input: PDFGeneratorInput): Promise<Buffer> {
  const { organizationName, startDate, endDate, expenses, totals } = input

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595 // A4 width in points
  const pageHeight = 842 // A4 height in points
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.9, 0.9, 0.9)

  // Helper to add new page if needed
  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  // Title
  page.drawText("Informe de Gastos", {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: black,
  })
  y -= 25

  // Organization name
  page.drawText(organizationName, {
    x: margin,
    y,
    size: 12,
    font: font,
    color: gray,
  })
  y -= 20

  // Date range
  page.drawText(`${formatDate(startDate)} - ${formatDate(endDate)}`, {
    x: margin,
    y,
    size: 10,
    font: font,
    color: gray,
  })
  y -= 40

  // Summary Section
  page.drawText("Resumen", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: black,
  })
  y -= 25

  // Summary table
  const summaryData = [
    ["Total Gastos", formatCurrency(totals.total, totals.currency)],
    ["Gastos Fijos", formatCurrency(totals.fixed, totals.currency)],
    ["Gastos Variables", formatCurrency(totals.variable, totals.currency)],
  ]

  for (const [label, value] of summaryData) {
    page.drawText(label, {
      x: margin,
      y,
      size: 10,
      font: font,
      color: gray,
    })
    page.drawText(value, {
      x: pageWidth - margin - font.widthOfTextAtSize(value, 10),
      y,
      size: 10,
      font: fontBold,
      color: black,
    })
    y -= 18
  }
  y -= 20

  // Category Breakdown
  ensureSpace(100)
  page.drawText("Desglose por Categoria", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: black,
  })
  y -= 25

  for (const cat of totals.byCategory.slice(0, 10)) {
    ensureSpace(20)
    const percentage = totals.total > 0
      ? `${((cat.amount / totals.total) * 100).toFixed(1)}%`
      : "0%"

    page.drawText(cat.name, {
      x: margin,
      y,
      size: 9,
      font: font,
      color: black,
    })
    page.drawText(formatCurrency(cat.amount, totals.currency), {
      x: margin + 250,
      y,
      size: 9,
      font: font,
      color: black,
    })
    page.drawText(percentage, {
      x: margin + 350,
      y,
      size: 9,
      font: font,
      color: gray,
    })
    y -= 16
  }
  y -= 20

  // Statistics
  ensureSpace(60)
  page.drawText("Estadisticas", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: black,
  })
  y -= 25

  const documented = expenses.filter((e) => e.documents.length > 0).length
  const undocumented = expenses.filter((e) => e.documents.length === 0).length

  const statsCol = contentWidth / 3
  page.drawText("Total gastos", { x: margin, y, size: 9, font: font, color: gray })
  page.drawText(String(expenses.length), { x: margin, y: y - 15, size: 14, font: fontBold, color: black })

  page.drawText("Documentados", { x: margin + statsCol, y, size: 9, font: font, color: gray })
  page.drawText(String(documented), { x: margin + statsCol, y: y - 15, size: 14, font: fontBold, color: black })

  page.drawText("Sin documentar", { x: margin + statsCol * 2, y, size: 9, font: font, color: gray })
  page.drawText(String(undocumented), { x: margin + statsCol * 2, y: y - 15, size: 14, font: fontBold, color: black })
  y -= 50

  // Expense List
  ensureSpace(60)
  page.drawText("Listado de Gastos", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: black,
  })
  y -= 25

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: contentWidth,
    height: 16,
    color: lightGray,
  })

  const cols = [0, 60, 200, 300, 360, 440]
  const headers = ["Fecha", "Proveedor", "Categoria", "Tipo", "Importe"]
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: margin + cols[i],
      y: y,
      size: 8,
      font: fontBold,
      color: gray,
    })
  })
  y -= 20

  // Table rows
  for (const expense of expenses) {
    ensureSpace(18)

    const row = [
      format(new Date(expense.date), "dd/MM/yy"),
      (expense.counterparty?.name || expense.description || "—").substring(0, 20),
      (expense.category?.name || "—").substring(0, 15),
      expense.entryType === "fixed" ? "Fijo" : "Var.",
      formatCurrency(expense.amount, expense.currency),
    ]

    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: margin + cols[i],
        y,
        size: 8,
        font: font,
        color: black,
      })
    })
    y -= 14
  }

  // Footer on each page
  const pages = pdfDoc.getPages()
  const generatedDate = format(new Date(), "dd/MM/yyyy 'a las' HH:mm")

  pages.forEach((p, i) => {
    p.drawText(`Generado el ${generatedDate}`, {
      x: margin,
      y: 30,
      size: 8,
      font: font,
      color: gray,
    })
    p.drawText(`Pagina ${i + 1} de ${pages.length}`, {
      x: pageWidth - margin - 60,
      y: 30,
      size: 8,
      font: font,
      color: gray,
    })
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
