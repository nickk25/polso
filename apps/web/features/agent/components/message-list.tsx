"use client"

import type { Message } from "ai"
import { Sparkle } from "@phosphor-icons/react"
import { MessageMarkdown } from "./message-markdown"
import { ToolCallResult } from "./tool-call-result"

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {messages.map((message) => (
        <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            className={
              message.role === "user"
                ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                : "max-w-[90%] text-sm"
            }
          >
            {message.role === "assistant" && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                <Sparkle className="h-3 w-3" weight="fill" />
                Polso AI
              </span>
            )}
            {message.role === "assistant" && message.toolInvocations?.map((inv) => (
              <ToolCallResult key={inv.toolCallId} invocation={inv} />
            ))}
            {message.content && (
              message.role === "user" ? (
                <span className="whitespace-pre-wrap">{message.content}</span>
              ) : (
                <MessageMarkdown content={message.content} />
              )
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex gap-1 items-center px-1 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  )
}
