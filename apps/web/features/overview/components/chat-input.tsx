"use client"

import { useRef } from "react"
import { ArrowUp, Paperclip, X } from "@phosphor-icons/react"
import { Badge } from "@polso/ui/badge"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

interface ChatInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  files?: File[]
  onFilesChange?: (files: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ value, onChange, onSubmit, files = [], onFilesChange, disabled, placeholder = "How can I help you today?" }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!onFilesChange || !e.target.files) return
    const incoming = Array.from(e.target.files).filter(
      (f) => UPLOAD_ACCEPTED_TYPES.includes(f.type) && f.size <= UPLOAD_MAX_FILE_SIZE
    )
    onFilesChange([...files, ...incoming])
    e.target.value = ""
  }

  function removeFile(index: number) {
    if (!onFilesChange) return
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !disabled

  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl">
      <div className="relative rounded-xl border bg-card">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {files.map((f, i) => (
              <Badge key={i} variant="outline" className="flex items-center gap-1 text-xs font-normal">
                {f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <textarea
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="w-full resize-none rounded-xl bg-transparent px-4 pt-3 pb-10 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        {onFilesChange && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={UPLOAD_ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="absolute bottom-2 left-2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="absolute bottom-2 right-2 rounded-lg bg-primary p-1.5 text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" weight="bold" />
        </button>
      </div>
    </form>
  )
}
