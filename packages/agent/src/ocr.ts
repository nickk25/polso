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

  // AI SDK uses "file" type for all media — works for images and PDFs
  const filePart = {
    type: "file" as const,
    data: base64,
    mimeType: contentType as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif"
      | "application/pdf",
  }

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
- amount: total paid including IVA (not base imponible)
- currency: EUR unless clearly stated otherwise
- date: YYYY-MM-DD format
- cif: Spanish tax ID — empresas use CIF (B/A/C/... + 8 digits), autónomos use NIF (8 digits + letter)
- documentType: "invoice" only if it has a número de factura, base imponible, and explicit IVA desglose
- vatRate: Spanish IVA rates are 0.21 (general), 0.10 (reducido), 0.04 (superreducido)
- Return null for any field not clearly visible in the document`,
          },
        ],
      },
    ],
  })

  return object
}
