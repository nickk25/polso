import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY_OCR })

export type MessageType =
  | "receipt_reminder"
  | "weekly_summary"
  | "monthly_summary"
  | "anomaly_alert"

export interface ProactiveContext {
  orgName: string
  messageType: MessageType
  unmatchedTransactions?: Array<{
    name: string
    amount: number
    currency: string
    date: string
  }>
  summary?: {
    period: string
    totalIncome: number
    totalExpenses: number
    currency: string
    topCategories: Array<{ name: string; amount: number }>
    receiptsConciliated: number
    totalTransactions: number
    conciliationPct: number
    previousPeriodConciliationPct?: number
    categoryChanges?: Array<{
      name: string
      currentAmount: number
      previousAmount: number
      changePct: number
    }>
  }
  anomalies?: Array<{
    description: string
    amount: number
    currency: string
    categoryName: string
    categoryAvg: number
  }>
  missingRecurring?: Array<{
    name: string
    expectedAmount: number
    currency: string
  }>
}

const SYSTEM_PROMPT = `Eres el asistente financiero de Polso. Te comunicas directamente con el dueño o responsable financiero de una empresa española por WhatsApp o Telegram.

Reglas:
- Usa SIEMPRE español de España, tuteo informal
- Tono amigable y directo, como un mensaje de un asesor de confianza
- Máximo 400 caracteres — el usuario lo lee en el móvil
- Solo 1 emoji por mensaje, si aporta. Nunca uses emojis decorativos
- Números en formato español: 1.234,50 €
- Nunca menciones Polso ni te presentes — ya saben quién eres
- No uses saludos formales ni despedidas
- Termina con una acción concreta si aplica`

export async function generateProactiveMessage(context: ProactiveContext): Promise<string> {
  const userPrompt = buildUserPrompt(context)

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    maxTokens: 200,
    temperature: 0.4,
  })

  return text.trim()
}

function fmt(amount: number, currency: string): string {
  return amount.toLocaleString("es-ES", { style: "currency", currency, maximumFractionDigits: 2 })
}

function buildUserPrompt(ctx: ProactiveContext): string {
  switch (ctx.messageType) {
    case "receipt_reminder": {
      const txs = ctx.unmatchedTransactions ?? []
      const lines = txs
        .slice(0, 4)
        .map((t) => `- ${t.name}: ${fmt(t.amount, t.currency)}`)
        .join("\n")
      const extra = txs.length > 4 ? `\n... y ${txs.length - 4} más` : ""
      return `El cliente ${ctx.orgName} tiene ${txs.length} transacciones sin comprobante de los últimos 7 días:\n${lines}${extra}\n\nRedacta un recordatorio breve para que envíe los comprobantes.`
    }

    case "weekly_summary": {
      const s = ctx.summary!
      const categories = s.topCategories
        .slice(0, 3)
        .map((c) => `${c.name}: ${fmt(c.amount, s.currency)}`)
        .join(", ")
      const prevPct =
        s.previousPeriodConciliationPct !== undefined
          ? ` (semana anterior: ${s.previousPeriodConciliationPct}%)`
          : ""
      return `Resumen semanal de ${ctx.orgName} (${s.period}):\n- Ingresos: ${fmt(s.totalIncome, s.currency)}\n- Gastos: ${fmt(s.totalExpenses, s.currency)}\n- Top categorías: ${categories}\n- Comprobantes: ${s.conciliationPct}%${prevPct}\n\nRedacta un resumen semanal conciso y útil.`
    }

    case "monthly_summary": {
      const s = ctx.summary!
      const categories = s.topCategories
        .slice(0, 3)
        .map((c) => `${c.name}: ${fmt(c.amount, s.currency)}`)
        .join(", ")
      const changes = (s.categoryChanges ?? [])
        .filter((c) => c.changePct > 30)
        .slice(0, 2)
        .map((c) => `${c.name} +${Math.round(c.changePct)}%`)
        .join(", ")
      const changesNote = changes ? `\n- Incrementos notables: ${changes}` : ""
      return `Cierre mensual de ${ctx.orgName} (${s.period}):\n- Ingresos: ${fmt(s.totalIncome, s.currency)}\n- Gastos: ${fmt(s.totalExpenses, s.currency)}\n- Top categorías: ${categories}\n- Comprobantes: ${s.conciliationPct}%${changesNote}\n\nRedacta un resumen de cierre mensual con lo más relevante.`
    }

    case "anomaly_alert": {
      const anomalyLines = (ctx.anomalies ?? [])
        .slice(0, 2)
        .map(
          (a) =>
            `- ${a.description}: ${fmt(a.amount, a.currency)} (media ${a.categoryName}: ${fmt(a.categoryAvg, a.currency)})`
        )
        .join("\n")
      const missingLines = (ctx.missingRecurring ?? [])
        .slice(0, 2)
        .map((r) => `- ${r.name}: esperado ~${fmt(r.expectedAmount, r.currency)}`)
        .join("\n")
      const parts = []
      if (anomalyLines) parts.push(`Gastos inusuales:\n${anomalyLines}`)
      if (missingLines) parts.push(`Cargos recurrentes no detectados este mes:\n${missingLines}`)
      return `Alertas para ${ctx.orgName}:\n${parts.join("\n\n")}\n\nRedacta una alerta breve y accionable.`
    }
  }
}
