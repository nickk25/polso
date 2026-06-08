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
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{children}</a>
    ) : (
      <span>{children}</span>
    )
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-muted/50">{children}</thead>
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-3 py-2 border-b border-border last-of-type:border-0 align-top">
        {children}
      </td>
    )
  },
  tr({ children }) {
    return <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>
  },
  ul({ children }) {
    return <ul className="my-2 ml-4 list-disc space-y-0.5">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-2 ml-4 list-decimal space-y-0.5">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },
  code({ children, className }) {
    const isBlock = className?.startsWith("language-")
    return isBlock ? (
      <pre className="my-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs font-mono">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
    )
  },
}

export function MessageMarkdown({ content, className }: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("text-sm leading-relaxed", className)}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
