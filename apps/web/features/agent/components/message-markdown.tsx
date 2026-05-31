"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MessageMarkdownProps {
  content: string
  className?: string
}

const components: Components = {
  a({ href, children }) {
    const safe = href?.startsWith("http://") || href?.startsWith("https://")
    return safe ? (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ) : (
      <span>{children}</span>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table className="text-xs">{children}</table>
      </div>
    )
  },
}

export function MessageMarkdown({ content, className }: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
