import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Polso — Know your numbers without waiting for your accountant",
    template: "%s — Polso",
  },
  description:
    "Connect your bank. See expenses categorized. Track your runway — updated daily, not monthly. Financial clarity for freelancers, founders, and small teams.",
  keywords: [
    "expense tracking",
    "financial management",
    "runway calculator",
    "burn rate",
    "cash flow",
    "bank sync",
    "open banking",
    "business finances",
    "freelancer finances",
    "startup runway",
  ],
  authors: [{ name: "Polso" }],
  creator: "Polso",
  metadataBase: new URL("https://polso.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://polso.app",
    siteName: "Polso",
    title: "Polso — Know your numbers without waiting for your accountant",
    description:
      "Connect your bank. See expenses categorized. Track your runway — updated daily, not monthly.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polso — Know your numbers without waiting for your accountant",
    description:
      "Connect your bank. See expenses categorized. Track your runway — updated daily, not monthly.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
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
        <Analytics />
      </body>
    </html>
  )
}
