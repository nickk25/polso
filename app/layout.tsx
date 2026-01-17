import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Polso - Financial Management",
  description: "Financial management and expense intelligence platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
