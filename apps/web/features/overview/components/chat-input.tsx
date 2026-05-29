"use client"

import { useState } from "react"
import { PaperPlaneRight, Plus, At, Paperclip } from "@phosphor-icons/react"

export function ChatInput() {
  const [value, setValue] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire up to AI agent
    setValue("")
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative rounded-xl border bg-card shadow-sm">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="How can I help you today?"
          rows={1}
          className="w-full resize-none rounded-xl bg-transparent px-4 pt-3 pb-10 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="absolute bottom-2 left-3 flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <At className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!value.trim()}
          className="absolute bottom-2 right-2 rounded-lg bg-primary p-1.5 text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
        </button>
      </div>
    </form>
  )
}
