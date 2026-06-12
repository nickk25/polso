"use client"

import { useEffect, useRef, useState } from "react"
import { authClient } from "../client"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { toast } from "@polso/ui/sonner"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

function isSafeRedirect(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")
}

function safeGetStorage(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function safeRemoveStorage(key: string): void {
  try { sessionStorage.removeItem(key) } catch {}
}

interface EmailOtpFormTranslations {
  emailPlaceholder?: string
  emailRequired?: string
  emailInvalid?: string
  sendError?: string
  sending?: string
  continueLabel?: string
  codeSentPrefix?: string
  codeResent?: string
  resendPrompt?: string
  resendLabel?: string
  otpError?: string
}

interface EmailOtpFormProps {
  heading?: string
  subheading?: string
  badge?: string
  redirectTo?: string
  translations?: EmailOtpFormTranslations
}

export function EmailOtpForm({
  heading = "Bienvenido a Polso",
  subheading = "Inicia sesión o crea una cuenta",
  badge,
  redirectTo = "/dashboard",
  translations = {},
}: EmailOtpFormProps) {
  const tr = {
    emailPlaceholder: translations.emailPlaceholder ?? "Ingresa tu correo electrónico",
    emailRequired: translations.emailRequired ?? "Por favor ingresa tu correo electrónico",
    emailInvalid: translations.emailInvalid ?? "Ingresa un correo válido",
    sendError: translations.sendError ?? "Error al enviar el código",
    sending: translations.sending ?? "Enviando...",
    continueLabel: translations.continueLabel ?? "Continuar",
    codeSentPrefix: translations.codeSentPrefix ?? "Te enviamos un código a",
    codeResent: translations.codeResent ?? "Código reenviado",
    resendPrompt: translations.resendPrompt ?? "¿No recibiste el email?",
    resendLabel: translations.resendLabel ?? "Reenviar código",
    otpError: translations.otpError ?? "Código incorrecto",
  }
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus()
  }, [step])

  async function sendOtp(emailToSend: string): Promise<string | null> {
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: emailToSend,
        type: "sign-in",
      })
      return error ? (error.message ?? tr.sendError) : null
    } catch (e) {
      return e instanceof Error ? e.message : tr.sendError
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!normalized) { setEmailError(tr.emailRequired); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setEmailError(tr.emailInvalid); return }
    setLoading(true)
    setEmailError(null)
    const err = await sendOtp(normalized)
    setLoading(false)
    if (err) { setEmailError(err); return }
    setEmail(normalized)
    setStep("otp")
  }

  function resetOtp() {
    setOtp(["", "", "", "", "", ""])
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  async function verifyOtp(otpValue: string) {
    setLoading(true)
    try {
      const { error } = await authClient.signIn.emailOtp({ email, otp: otpValue })
      if (error) {
        resetOtp()
        toast.error(error.message ?? tr.otpError)
        return
      }
      const stored = safeGetStorage(AUTH_CALLBACK_KEY)
      const target = stored && isSafeRedirect(stored) ? stored : redirectTo
      // Hard navigation: ensures the fresh session cookie is sent with the next request
      // and avoids the router.push + router.refresh race that kept the form visible
      window.location.href = target
      safeRemoveStorage(AUTH_CALLBACK_KEY)
    } catch (e) {
      resetOtp()
      toast.error(e instanceof Error ? e.message : tr.otpError)
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (loading || !/^[0-9]*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== "")) verifyOtp(next.join(""))
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    if (loading) return
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = Array(6).fill("")
    pasted.split("").forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
    if (pasted.length === 6) verifyOtp(pasted)
  }

  async function handleResend() {
    setResent(false)
    setLoading(true)
    const err = await sendOtp(email)
    setLoading(false)
    if (err) { toast.error(err); return }
    resetOtp()
    setResent(true)
  }

  if (step === "email") {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          {badge && (
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">{badge}</p>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{heading}</h1>
          <p className="text-sm text-zinc-500">{subheading}</p>
        </div>
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={tr.emailPlaceholder}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
            autoFocus
            disabled={loading}
          />
          {emailError && <p className="text-sm text-destructive text-center">{emailError}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? tr.sending : tr.continueLabel}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {badge && (
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">{badge}</p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{heading}</h1>
        <p className="text-sm text-zinc-500">
          {tr.codeSentPrefix}{" "}
          <span className="font-medium text-zinc-900">{email}</span>
        </p>
      </div>
      <div className="space-y-8">
        <div className="flex justify-center" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              disabled={loading}
              className={[
                "w-12 h-14 text-center text-xl font-semibold",
                "border-t border-b border-l border-border bg-background text-foreground",
                i === 5 ? "border-r border-border" : "",
                "focus:outline-none focus:bg-muted/60",
                "disabled:opacity-50",
              ].join(" ")}
            />
          ))}
        </div>
        {resent && (
          <p className="text-xs text-center text-muted-foreground">{tr.codeResent}</p>
        )}
        <p className="text-xs text-center text-muted-foreground/70">
          {tr.resendPrompt}{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="underline underline-offset-4 hover:text-muted-foreground disabled:opacity-50"
          >
            {tr.resendLabel}
          </button>
        </p>
      </div>
    </div>
  )
}
