import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText, type CoreMessage } from "ai"
import { prisma } from "@/lib/db"
import { buildTools } from "@/features/agent/tools"
import { buildSystemPrompt } from "./system-prompt"
import type { ChatContext } from "./context"

if (!process.env.ANTHROPIC_API_KEY_CHAT) throw new Error("ANTHROPIC_API_KEY_CHAT is not set")

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY_CHAT })

export interface AgentRunOptions {
  organizationId: string
  userId: string
  messages: CoreMessage[]
  channel: "web" | "telegram" | "whatsapp"
  locale?: "es" | "en"
}

export interface AgentRunResult {
  text: string
  usage?: { promptTokens: number; completionTokens: number }
}

export async function runAgent(opts: AgentRunOptions): Promise<AgentRunResult> {
  const { organizationId, userId, messages, channel, locale = "es" } = opts

  // Build a ChatContext without relying on getAuthContext() or request headers.
  // Note: user name/email are managed by Neon Auth (not in Prisma), so we use
  // a generic greeting for non-web channels.
  const [org, account] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, planExpiresAt: true },
    }),
    prisma.account.findFirst({
      where: { organizationId, status: "active" },
      select: { currency: true },
    }),
  ])

  const firstName = "there"
  const today = new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const ctx: ChatContext = {
    organizationId,
    orgName: org?.name ?? "your company",
    currency: account?.currency ?? "EUR",
    locale,
    today,
    firstName,
  }

  const system = buildSystemPrompt(ctx, { channel })
  const tools = buildTools(organizationId, userId)

  const startedAt = Date.now()
  const result = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system,
    messages,
    tools,
    maxSteps: 8,
  })

  // Persist ChatLog for visibility
  const userMessage = messages.findLast((m) => m.role === "user")
  const userMessageText =
    typeof userMessage?.content === "string"
      ? userMessage.content
      : JSON.stringify(userMessage?.content ?? "")

  try {
    await prisma.chatLog.create({
      data: {
        organizationId,
        userId,
        userMessage: userMessageText.slice(0, 4000),
        assistantText: result.text.slice(0, 2000),
        toolNames: result.toolCalls?.map((c) => c.toolName) ?? [],
        toolCount: result.toolCalls?.length ?? 0,
        inputTokens: result.usage?.promptTokens ?? null,
        outputTokens: result.usage?.completionTokens ?? null,
        durationMs: Date.now() - startedAt,
        hadError: result.finishReason === "error",
        source: channel,
      },
    })
  } catch (err) {
    console.error("[runAgent] ChatLog persist failed:", err)
  }

  return {
    text: result.text,
    usage: result.usage
      ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        }
      : undefined,
  }
}
