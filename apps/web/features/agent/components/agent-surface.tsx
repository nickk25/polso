"use client"

import { useRef, useEffect, useState } from "react"
import { useChat } from "ai/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  ArrowsLeftRight,
  Bank,
  UploadSimple,
  Export,
  X,
} from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { ChatInput } from "@/features/overview/components/chat-input"
import { MessageList } from "./message-list"

interface KpiData {
  cashBalance: number
  netCashFlow: number
  burnRate: number
  runway: number
  currency: string
  vatCurrentQuarterNet: number | null
  vatCurrentQuarterLabel: string
}

interface Alert {
  id: string
  severity: string
  title: string
  message: string
}

export interface AgentSurfaceProps {
  greeting: string
  hasActivityThisMonth: boolean
  kpi: KpiData
  unreadAlerts: Alert[]
  firstName: string
}

function KpiCell({ label, value, subLabel }: { label: string; value: React.ReactNode; subLabel: string }) {
  return (
    <div className="bg-card p-6 flex flex-col">
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold tabular-nums mt-2">{value}</div>
      <span className="mt-1 text-xs text-muted-foreground">{subLabel}</span>
    </div>
  )
}

export function AgentSurface({ greeting, hasActivityThisMonth, kpi, unreadAlerts, firstName }: AgentSurfaceProps) {
  const t = useTranslations("dashboard")
  const ta = useTranslations("agent")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append, error } = useChat({
    api: "/api/chat",
  })

  const isActive = messages.length > 0
  const isBusy = isLoading || isUploading

  useEffect(() => {
    if (isActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isActive])

  async function handleSubmitWithFiles(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() && pendingFiles.length === 0) return

    if (pendingFiles.length === 0) {
      handleSubmit(e)
      return
    }

    // Multipart path: pre-process files with Haiku, then stream Sonnet response
    const filesToUpload = pendingFiles
    setPendingFiles([])
    setInput("")
    const fileNames = filesToUpload.map((f) => `📎 ${f.name}`).join("\n")
    const userContent = [input.trim(), fileNames].filter(Boolean).join("\n")
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: userContent,
      parts: [{ type: "text" as const, text: userContent }],
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("messages", JSON.stringify(nextMessages))
      for (const f of filesToUpload) fd.append("file", f)

      // Use append to stream the response back into useChat state
      const res = await fetch("/api/chat", { method: "POST", body: fd })
      if (!res.ok || !res.body) throw new Error("Upload failed")

      // Read the data stream and append each chunk as an assistant message
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Parse Vercel AI data stream format: lines starting with "0:"
        for (const line of chunk.split("\n")) {
          if (line.startsWith("0:")) {
            try {
              assistantText += JSON.parse(line.slice(2))
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
      if (assistantText) {
        setMessages([
          ...nextMessages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantText,
            parts: [{ type: "text" as const, text: assistantText }],
          },
        ])
      }
    } catch {
      // Fall back: show generic error in chat
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: ta("chatError"),
          parts: [{ type: "text" as const, text: ta("chatError") }],
        },
      ])
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => setMessages([])

  return (
    <div className="flex flex-col min-h-full max-w-3xl mx-auto w-full px-6 gap-10 pt-[25vh] md:pt-[420px]">
      {isActive ? (
        // Chat takeover view — full-height column, no inherited padding
        <div className="fixed inset-0 left-[var(--sidebar-width,3.5rem)] flex flex-col bg-background z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 h-18 border-b shrink-0">
            <span className="text-sm font-medium">{ta("chatTitle")}</span>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {ta("closeChat")}
            </button>
          </div>

          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6">
              <MessageList messages={messages} isLoading={isBusy} />
              <div ref={messagesEndRef} />
              {error && (
                <p className="text-xs text-red-500 text-center mt-4">{ta("chatError")}</p>
              )}
            </div>
          </div>

          {/* Input + disclaimer — pinned at bottom */}
          <div className="shrink-0 px-6 py-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              <ChatInput
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmitWithFiles}
                files={pendingFiles}
                onFilesChange={setPendingFiles}
                disabled={isBusy}
                placeholder={t("chatPlaceholder")}
              />
              <p className="text-[11px] text-center text-muted-foreground/50">
                {ta("disclaimer")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Default hero view
        <>
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <h1 className="text-3xl font-semibold">
                {greeting},{" "}
                <span className="italic font-serif">{firstName}</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActivityThisMonth ? t("hasTransactionsThisMonth") : t("noTransactionsThisMonth")}
              </p>
            </div>

            <ChatInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmitWithFiles}
              files={pendingFiles}
              onFilesChange={setPendingFiles}
              disabled={isBusy}
              placeholder={t("chatPlaceholder")}
            />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/transactions">
                  <ArrowsLeftRight className="h-3.5 w-3.5" />
                  {t("quickActions.addTransaction")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/banking">
                  <Bank className="h-3.5 w-3.5" />
                  {t("quickActions.connectBank")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/vault">
                  <UploadSimple className="h-3.5 w-3.5" />
                  {t("quickActions.uploadReceipt")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/export">
                  <Export className="h-3.5 w-3.5" />
                  {t("quickActions.export")}
                </Link>
              </Button>
            </div>
          </div>

          {/* KPI grid */}
          <div className="pb-8 flex flex-col gap-8 shrink-0">
            <div className="grid grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border">
              <KpiCell
                label={t("stats.cashBalance")}
                value={formatCurrency(kpi.cashBalance, kpi.currency)}
                subLabel={t("stats.acrossAccounts", { count: 1 })}
              />
              <KpiCell
                label={t("stats.netCashflow")}
                value={
                  <span className={kpi.netCashFlow >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {kpi.netCashFlow >= 0 ? "+" : ""}{formatCurrency(kpi.netCashFlow, kpi.currency)}
                  </span>
                }
                subLabel={t("stats.thisMonth")}
              />
              <KpiCell
                label={t("stats.burnRate")}
                value={kpi.burnRate > 0 ? formatCurrency(kpi.burnRate, kpi.currency) : "—"}
                subLabel={t("stats.perMonth")}
              />
              <KpiCell
                label={t("stats.runway")}
                value={kpi.runway > 0 ? `${kpi.runway.toFixed(1)} mo` : "—"}
                subLabel={t("stats.atCurrentBurn")}
              />
            </div>

            {kpi.vatCurrentQuarterNet !== null && (
              <div className="grid grid-cols-1 rounded-xl overflow-hidden border bg-border">
                <KpiCell
                  label={t("stats.vatThisQuarter")}
                  value={
                    <span className={kpi.vatCurrentQuarterNet >= 0 ? "text-amber-500" : "text-green-600 dark:text-green-400"}>
                      {kpi.vatCurrentQuarterNet >= 0 ? "" : "-"}{formatCurrency(Math.abs(kpi.vatCurrentQuarterNet), kpi.currency)}
                    </span>
                  }
                  subLabel={kpi.vatCurrentQuarterLabel}
                />
              </div>
            )}

            {unreadAlerts.length > 0 && (
              <div className="space-y-1.5 pb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{t("alerts.needsAttention")}</span>
                  <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                    {t("alerts.viewAll")}
                  </Link>
                </div>
                {unreadAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                      alert.severity === "critical" ? "bg-red-500"
                      : alert.severity === "warning" ? "bg-amber-400"
                      : "bg-blue-400"
                    }`} />
                    <p className="leading-snug">
                      <span className="text-xs font-medium text-foreground/80">{alert.title}</span>
                      {" "}
                      <span className="text-[11px] text-muted-foreground">{alert.message}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
