"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Application Error</h1>
          <p className="text-muted-foreground mb-6">
            Something went wrong. Please try refreshing the page.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  )
}
