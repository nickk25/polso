import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPartnerNotificationEmail } from "@polso/db"
import { evaluateTriggers } from "@/features/proactive/lib/evaluate-triggers"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendProactiveMessage } from "@/features/proactive/lib/send-proactive-message"
import { buildPartnerDigest } from "@/features/notifications/lib/build-partner-digest"
import { sendPartnerDigest } from "@polso/email/send"

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
    const now = new Date()
    const [proactive, digest] = await Promise.all([runProactiveAgent(), runPartnerDigests(now)])
    const result = { ...proactive, ...digest }
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

interface ProactiveResult {
  orgsEvaluated: number
  messagesSent: number
  skipped: number
  errors: number
}

interface DigestResult {
  digestsSent: number
  digestErrors: number
}

async function runProactiveAgent(): Promise<ProactiveResult> {
  // Find all client orgs with at least one channel linked and opt-out disabled
  const orgs = await prisma.organization.findMany({
    where: {
      type: "client",
      agentOptOut: false,
      OR: [
        { whatsappPhone: { not: null } },
        { userOrganizations: { some: { telegramChatId: { not: null } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
      userOrganizations: {
        where: { telegramChatId: { not: null } },
        select: { telegramChatId: true },
        take: 1,
      },
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
      const orgWithTelegram = {
        ...org,
        telegramChatId: org.userOrganizations[0]?.telegramChatId ?? null,
      }
      const sent = await sendProactiveMessage(orgWithTelegram, trigger.messageType, content, trigger.context)

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

async function runPartnerDigests(now: Date): Promise<DigestResult> {
  const isMonday = now.getUTCDay() === 1
  const partners = await prisma.organization.findMany({
    where: {
      type: "partner",
      digestCadence: { in: isMonday ? ["daily", "weekly"] : ["daily"] },
    },
    select: { id: true, name: true, digestCadence: true },
  })

  if (partners.length === 0) return { digestsSent: 0, digestErrors: 0 }

  console.log(`[Cron] digest: evaluating ${partners.length} partners`)

  let digestsSent = 0
  let digestErrors = 0

  for (const partner of partners) {
    try {
      const recipient = await getPartnerNotificationEmail(partner.id)
      if (!recipient) continue

      const cadence = partner.digestCadence as "daily" | "weekly"
      const periodLabel = cadence === "daily" ? "ayer" : "esta semana"
      const digest = await buildPartnerDigest(partner.id, cadence, now)

      await sendPartnerDigest(
        recipient.email,
        recipient.name,
        partner.name,
        cadence,
        periodLabel,
        digest.newClients,
        digest.receiptsUploaded,
        digest.pendingReceipts,
        process.env.NEXT_PUBLIC_APP_URL ?? ""
      )

      digestsSent++
      console.log(`[Cron] digest: sent ${cadence} digest to partner ${partner.id}`)
    } catch (err) {
      console.error(`[Cron] digest: error for partner ${partner.id}:`, err)
      digestErrors++
    }
  }

  return { digestsSent, digestErrors }
}
