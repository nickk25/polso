import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { Toaster } from "@polso/ui/sonner"
import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Polso Partner — Panel de asesoría",
    template: "%s — Polso Partner",
  },
  description: "Gestiona los movimientos y comprobantes de tus clientes desde un solo panel.",
  metadataBase: new URL("https://partner.polso.app"),
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
