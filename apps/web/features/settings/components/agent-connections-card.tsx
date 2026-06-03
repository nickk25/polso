"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { SpinnerGap, CheckCircle, Warning } from "@phosphor-icons/react"
import { QRCodeSVG } from "qrcode.react"
import { generateAgentLinkCodeAction } from "../actions/generate-agent-link"

const TELEGRAM_BOT_URL = "https://t.me/PolsoAgentBot"

interface AgentConnectionsCardProps {
  whatsappPhone: string | null
  telegramChatId: string | null
}

export function AgentConnectionsCard({
  whatsappPhone,
  telegramChatId,
}: AgentConnectionsCardProps) {
  const router = useRouter()
  const t = useTranslations("agent.connections")
  const tg = useTranslations("agent.connections.telegram")
  const wa = useTranslations("agent.connections.whatsapp")
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tick = useCallback(() => {
    if (!expiresAt) return
    const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    setSecondsLeft(left)
    if (left === 0) {
      setCode(null)
      setExpiresAt(null)
    }
  }, [expiresAt])

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, tick])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generateAgentLinkCodeAction()
    setLoading(false)
    if (result.success) {
      setCode(result.data.code)
      setExpiresAt(new Date(result.data.expiresAt))
      setSecondsLeft(300)
    } else {
      setError(result.error)
    }
  }

  function handleRefreshConnections() {
    router.refresh()
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, "0")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 divide-x">
          {/* ── Telegram ─────────────────────────────────────── */}
          <div className="space-y-5 pr-8">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{tg("title")}</h3>
              {telegramChatId ? (
                <Badge variant="default">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {tg("connected")}
                </Badge>
              ) : (
                <Badge variant="outline">{tg("notConnected")}</Badge>
              )}
            </div>

            {/* Connection flow */}
            <div className="flex gap-8">
              {/* Instructions */}
              <div className="flex-1 space-y-5">
                {code ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tg("step1Label")}</p>
                      <p className="text-sm font-medium">{tg("step1Title")}</p>
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-4xl font-bold tracking-[0.25em]">{code}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">{minutes}:{seconds}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tg("step2Label")}</p>
                      <p className="text-sm font-medium">{tg("step2Title")}</p>
                      <p className="text-xs text-muted-foreground">{tg("step2Hint")}</p>
                      <div className="flex gap-2 pt-1">
                        <Button asChild size="sm">
                          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer">
                            {tg("openBot")}
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleRefreshConnections}>
                          {tg("refreshStatus")}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <ol className="space-y-4">
                      {([
                        tg.rich("howToStep1", { strong: (c) => <strong>{c}</strong> }),
                        tg.rich("howToStep2", { link: (c) => <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">{c}</a> }),
                        tg("howToStep3"),
                      ] as React.ReactNode[]).map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground leading-5">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <Button onClick={handleGenerate} disabled={loading}>
                      {loading && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
                      {tg("generateCode")}
                    </Button>
                  </>
                )}

                {error && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <Warning className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </div>

              {/* QR code */}
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                <div className="rounded-2xl p-4 shadow-sm transition-shadow group-hover:shadow-md" style={{ background: "#18181B" }}>
                  <QRCodeSVG
                    value={TELEGRAM_BOT_URL}
                    size={200}
                    bgColor="#18181B"
                    fgColor="#FAFAFA"
                    imageSettings={{
                      src: "/polso-qr-icon.svg",
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                  <p className="mt-3 text-center text-[11px] font-medium tracking-wide" style={{ color: "#FAFAFA" }}>
                    {tg("qrScanLabel")}
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* ── WhatsApp ──────────────────────────────────────── */}
          <div className="space-y-5 pl-8">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{wa("title")}</h3>
              <Badge variant="secondary">{wa("comingSoon")}</Badge>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-muted-foreground" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{wa("connectTitle")}</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">{wa("connectDescription")}</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                {wa("comingSoonButton")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
