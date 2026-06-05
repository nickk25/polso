import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY_OCR })
import { z } from "zod"

export const ReceiptSchema = z.object({
  displayName: z.string().nullable().describe("Vendor or store name"),
  amount: z.number().nullable().describe("Total amount paid including all taxes"),
  currency: z.string().default("EUR").describe("ISO 4217 currency code"),
  date: z.string().nullable().describe("Document date in YYYY-MM-DD format"),
  cif: z
    .string()
    .nullable()
    .describe(
      "Spanish vendor tax ID. Company CIF format: B12345678. Autónomo NIF format: 12345678A"
    ),
  documentType: z
    .enum(["receipt", "invoice", "other"])
    .describe(
      'receipt = simple purchase ticket/recibo. invoice = factura with número de factura, base imponible, and IVA breakdown. other = unrecognizable or irrelevant document.'
    ),
  vatAmount: z.number().nullable().describe("Total VAT/IVA amount"),
  vatRate: z
    .number()
    .nullable()
    .describe("Primary VAT rate as decimal: 0.21 (general), 0.10 (reducido), 0.04 (superreducido)"),
  invoiceNumber: z.string().nullable().describe("Invoice number (número de factura), if present"),
})

export type ReceiptData = z.infer<typeof ReceiptSchema>

/**
 * Extract receipt or invoice data from an image or PDF using Claude Haiku.
 * Optimized for Spanish business documents.
 */
export async function extractReceiptData(
  fileData: string | Buffer,
  contentType: string
): Promise<ReceiptData> {
  const base64 =
    typeof fileData === "string"
      ? fileData
      : fileData.toString("base64")

  // AI SDK uses "image" for raster images and "file" for PDFs
  const isPdf = contentType === "application/pdf"
  const filePart = isPdf
    ? ({ type: "file" as const, data: base64, mimeType: "application/pdf" as const })
    : ({
        type: "image" as const,
        image: base64,
        mimeType: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      })

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: ReceiptSchema,
    messages: [
      {
        role: "user",
        content: [
          filePart,
          {
            type: "text",
            text: `Extract data from this Spanish business document.

Rules:
- amount: total amount paid (TOTAL a pagar / TOTAL factura), including IVA — NOT the base imponible
- vatAmount: the IVA amount charged (cuota de IVA / importe IVA). Look for lines labeled "IVA", "Cuota IVA", "Importe IVA". If multiple IVA rates, sum them.
- vatRate: primary IVA rate as decimal — 0.21 (general), 0.10 (reducido), 0.04 (superreducido). Use the rate with the highest vatAmount if multiple.
- currency: EUR unless clearly stated otherwise
- date: document date in YYYY-MM-DD format (fecha de factura / fecha emisión, not fecha de vencimiento)
- cif: Spanish tax ID of the VENDOR (emisor), not the buyer — empresas: CIF (B/A/C/G/... + 8 digits), autónomos: NIF (8 digits + letter)
- documentType: "invoice" only if it has a número de factura, base imponible, and explicit IVA breakdown. "receipt" for simple tickets/recibos. "other" for anything unrecognizable.
- invoiceNumber: número de factura if present (e.g. "F-2024-001", "2024/123")
- Return null for any field not clearly visible in the document`,
          },
        ],
      },
    ],
  })

  return object
}
