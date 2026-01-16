"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  message?: string
}

export function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
}: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console in development
    console.error("Error boundary caught:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <WarningCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">{message}</p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={reset} variant="outline">
            <ArrowClockwise className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
