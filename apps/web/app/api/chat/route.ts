import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { getChatContext } from "@/features/agent/lib/context"
import { buildSystemPrompt } from "@/features/agent/lib/system-prompt"
import { buildTools } from "@/features/agent/tools"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    const ctx = await getChatContext()
    const system = buildSystemPrompt(ctx)
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
