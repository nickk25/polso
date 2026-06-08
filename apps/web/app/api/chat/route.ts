import { createAnthropic } from "@ai-sdk/anthropic"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { streamText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { getChatContext } from "@/features/agent/lib/context"
import { buildSystemPrompt } from "@/features/agent/lib/system-prompt"
import { buildTools } from "@/features/agent/tools"
import { processChatAttachment, type ProcessedAttachment } from "@/features/agent/lib/process-chat-attachment"
import { runMatchingForInboxItem } from "@/features/inbox/lib/run-inbox-matching"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"
import { checkAiRateLimit } from "@polso/cache/ai-rate-limit"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY_CHAT })

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const reqContentType = request.headers.get("content-type") ?? ""

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any[]
    let fileAttachments: { buffer: Buffer; contentType: string; fileName: string }[] = []

    if (reqContentType.startsWith("multipart/form-data")) {
      const formData = await request.formData()
      messages = JSON.parse(formData.get("messages") as string)
      const files = formData.getAll("file") as File[]
      for (const f of files) {
        if (!UPLOAD_ACCEPTED_TYPES.includes(f.type)) continue
        if (f.size > UPLOAD_MAX_FILE_SIZE) continue
        fileAttachments.push({
          buffer: Buffer.from(await f.arrayBuffer()),
          contentType: f.type,
          fileName: f.name,
        })
      }
    } else {
      messages = (await request.json()).messages
    }

    const ctx = await getChatContext()

    const rl = await checkAiRateLimit(ctx.organizationId, "sonnet")
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Has alcanzado el límite diario del asistente. Inténtalo mañana." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.reset),
          },
        }
      )
    }

    // Process each attachment with Haiku before streaming Sonnet
    const processed: ProcessedAttachment[] = []
    for (const att of fileAttachments) {
      processed.push(
        await processChatAttachment(ctx.organizationId, att.buffer, att.contentType, att.fileName)
      )
    }

    // Trigger matching in background for saved/duplicate items
    for (const p of processed) {
      if ((p.status === "saved" || p.status === "duplicate") && p.inboxItemId) {
        const itemId = p.inboxItemId
        after(async () => {
          await runMatchingForInboxItem(ctx.organizationId, itemId)
          revalidatePath("/vault")
        })
      }
    }

    const system = buildSystemPrompt(ctx, processed.length > 0 ? processed : undefined)
    const tools = buildTools()

    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system,
      messages,
      tools,
      maxSteps: 8,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("[Chat] Error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 })
  }
}
