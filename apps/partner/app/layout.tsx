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
    default: "Polso Partner",
    template: "%s — Polso Partner",
  },
  description: "Panel de asesoría — Polso",
  metadataBase: new URL("https://partner.polso.app"),
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
