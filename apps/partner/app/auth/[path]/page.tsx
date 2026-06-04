"use client"

import { useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { CheckCircle } from "@phosphor-icons/react"
import { EmailOtpForm } from "@polso/auth/ui"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

const FEATURES = [
  "Visibilidad total de todos tus clientes en un solo lugar",
  "Conciliación automática de recibos y transacciones",
  "Alertas proactivas cuando un cliente necesita atención",
]

const SIGN_IN_PATHS = new Set(["sign-in", "magic-link"])

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = params.path

  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl")
    if (callbackUrl) {
      sessionStorage.setItem(AUTH_CALLBACK_KEY, callbackUrl)
    }
  }, [searchParams])

  useEffect(() => {
    if (!SIGN_IN_PATHS.has(path)) {
      router.replace("/auth/sign-in")
    }
  }, [path, router])

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="text-xl font-semibold tracking-tight">Polso Partner</div>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-tight">
              Tus clientes,<br />siempre al día.
            </h2>
            <p className="text-primary-foreground/70">
              Gestiona las finanzas de todos tus clientes desde un panel unificado — con sincronización bancaria automática y conciliación inteligente.
            </p>
          </div>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <CheckCircle weight="fill" className="h-4 w-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Polso. Todos los derechos reservados.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-xl font-semibold tracking-tight lg:hidden">Polso Partner</div>
          {SIGN_IN_PATHS.has(path) && (
            <EmailOtpForm
              heading="Bienvenido a Polso"
              subheading="Panel de asesoría"
              redirectTo="/"
            />
          )}
        </div>
      </div>
    </div>
  )
}
