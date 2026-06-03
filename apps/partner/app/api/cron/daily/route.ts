import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { evaluateTriggers } from "@/features/proactive/lib/evaluate-triggers"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendProactiveMessage } from "@/features/proactive/lib/send-proactive-message"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Daily proactive agent cron — runs at 7:00 UTC (9:00 CET).
 *
 * For each client org with a linked Telegram or WhatsApp channel:
 * - Evaluates what message to send today (monthly/weekly summary, anomaly alert, receipt reminder)
 * - Generates an AI message with Claude Haiku
 * - Sends via the linked channel and logs to ProactiveMessage
 *
 * Rate limit: max 1 message/day/org (enforced in sendProactiveMessage).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const secretParam = request.nextUrl.searchParams.get("secret")
  const providedSecret = authHeader?.replace("Bearer ", "") || secretParam

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    const result = await runProactiveAgent()
    return NextResponse.json({ ...result, duration: Date.now() - startTime })
  } catch (error) {
    console.error("[Cron] daily error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

interface CronResult {
  orgsEvaluated: number
  messagesSent: number
  skipped: number
  errors: number
}

async function runProactiveAgent(): Promise<CronResult> {
  // Find all client orgs with at least one channel linked and opt-out disabled
  const orgs = await prisma.organization.findMany({
    where: {
      type: "client",
      agentOptOut: false,
      OR: [
        { whatsappPhone: { not: null } },
        { telegramChatId: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
      telegramChatId: true,
      partnerLinks: {
        where: { status: "active" },
        take: 1,
        select: {
          partner: {
            select: {
              receiptReminderHours: true,
              autoRemindersEnabled: true,
            },
          },
        },
      },
    },
  })

  if (orgs.length === 0) {
    console.log("[Cron] daily: no orgs with linked channels")
    return { orgsEvaluated: 0, messagesSent: 0, skipped: 0, errors: 0 }
  }

  console.log(`[Cron] daily: evaluating ${orgs.length} orgs`)

  const now = new Date()
  let messagesSent = 0
  let skipped = 0
  let errors = 0

  for (const org of orgs) {
    try {
      const partnerSettings = org.partnerLinks[0]?.partner
      if (partnerSettings && !partnerSettings.autoRemindersEnabled) {
        skipped++
        continue
      }
      const receiptReminderHours = partnerSettings?.receiptReminderHours ?? 48
      const trigger = await evaluateTriggers(org.id, org.name, now, receiptReminderHours)

      if (!trigger) {
        skipped++
        continue
      }

      const content = await generateProactiveMessage(trigger.context)
      const sent = await sendProactiveMessage(org, trigger.messageType, content, trigger.context)

      if (sent) {
        messagesSent++
        console.log(`[Cron] daily: sent ${trigger.messageType} to org ${org.id}`)
      } else {
        skipped++
      }
    } catch (err) {
      console.error(`[Cron] daily: error for org ${org.id}:`, err)
      errors++
    }
  }

  console.log(
    `[Cron] daily: done — ${orgs.length} evaluated, ${messagesSent} sent, ${skipped} skipped, ${errors} errors`
  )

  return {
    orgsEvaluated: orgs.length,
    messagesSent,
    skipped,
    errors,
  }
}
