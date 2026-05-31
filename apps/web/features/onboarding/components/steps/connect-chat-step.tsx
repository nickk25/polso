"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { CheckCircle, SpinnerGap } from "@phosphor-icons/react"
import { generateAgentLinkCodeAction } from "@/features/settings/actions/generate-agent-link"
import { completeOnboardingAction } from "../../actions/complete-onboarding"

interface ConnectChatStepProps {
  telegramConnected: boolean
}

export function ConnectChatStep({ telegramConnected }: ConnectChatStepProps) {
  const t = useTranslations("onboarding.steps.connectChat")
  const [connected, setConnected] = useState(telegramConnected)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)

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
    const result = await generateAgentLinkCodeAction()
    setLoading(false)
    if (result.success) {
      setCode(result.data.code)
      setExpiresAt(new Date(result.data.expiresAt))
      setSecondsLeft(300)
    }
  }

  async function handleDone() {
    setCompleting(true)
    await completeOnboardingAction()
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, "0")

  return (
    <div className="space-y-6">
      {connected ? (
        <div className="flex items-center gap-2">
          <Badge variant="default">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("telegramConnected")}
          </Badge>
        </div>
      ) : code ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="font-mono text-3xl font-bold tracking-[0.3em]">{code}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {minutes}:{seconds}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("sendToBot")}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConnected(true)
              setCode(null)
            }}
          >
            {t("refreshStatus")}
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={handleGenerate} disabled={loading}>
          {loading && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
          {t("generateCode")}
        </Button>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={handleDone} disabled={completing}>
          {completing && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
          {t("done")}
        </Button>
        {!connected && (
          <button
            type="button"
            onClick={handleDone}
            disabled={completing}
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            {t("skip")}
          </button>
        )}
      </div>
    </div>
  )
}
