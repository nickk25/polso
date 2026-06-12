import { createAnthropic } from "@ai-sdk/anthropic"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { streamText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { getChatContext } from "@/features/agent/lib/context"
import { buildSystemPrompt } from "@/features/agent/lib/system-prompt"
import { buildTools } from "@/features/agent/tools"
import { processChatAttachment, type ProcessedAttachment } from "@/features/agent/lib/process-chat-attachment"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { checkAiRateLimit } from "@polso/cache/ai-rate-limit"

if (!process.env.ANTHROPIC_API_KEY_CHAT) throw new Error("ANTHROPIC_API_KEY_CHAT is not set")

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY_CHAT })

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const reqContentType = request.headers.get("content-type") ?? ""

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any[]
    const fileAttachments: { buffer: Buffer; contentType: string; fileName: string }[] = []

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

    const [ctx, { userId }] = await Promise.all([getChatContext(), getAuthContext()])
    const startedAt = Date.now()
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user")
    const userMessageText: string = typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage?.content ?? "")

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { planExpiresAt: true },
    })
    if (org?.planExpiresAt && org.planExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Tu suscripción ha expirado. Renueva tu plan para usar el asistente." },
        { status: 402 }
      )
    }

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

    // Revalidate vault path for any saved items (matching already ran synchronously in processChatAttachment)
    for (const p of processed) {
      if ((p.status === "saved" || p.status === "duplicate") && p.inboxItemId) {
        revalidatePath("/vault")
      }
    }

    const cappedMessages = messages.slice(-20)
    if (JSON.stringify(cappedMessages).length > 50_000) {
      return NextResponse.json({ error: "Mensaje demasiado largo." }, { status: 413 })
    }

    const system = buildSystemPrompt(ctx, processed.length > 0 ? processed : undefined)
    const tools = buildTools()

    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system,
      messages: cappedMessages,
      tools,
      maxSteps: 3,
      onFinish: async ({ text, toolCalls, finishReason, usage }) => {
        after(async () => {
          try {
            await prisma.chatLog.create({
              data: {
                organizationId: ctx.organizationId,
                userId,
                userMessage: userMessageText.slice(0, 4000),
                assistantText: text.slice(0, 2000),
                toolNames: toolCalls?.map((c) => c.toolName) ?? [],
                toolCount: toolCalls?.length ?? 0,
                inputTokens: usage?.promptTokens ?? null,
                outputTokens: usage?.completionTokens ?? null,
                durationMs: Date.now() - startedAt,
                hadError: finishReason === "error",
                source: "dashboard",
              },
            })
          } catch (err) {
            console.error("[ChatLog] failed to persist:", err)
          }
        })
      },
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
