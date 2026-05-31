"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { SyncToastContent, type SyncState } from "./bank-sync-toast"

const POLL_INTERVAL_MS = 3000
const DISMISS_AFTER_MS = 6000

export function SyncMonitor() {
  const router = useRouter()
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<"idle" | "syncing" | "done">("idle")

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function check() {
    try {
      const res = await fetch("/api/banking/sync-status")
      if (!res.ok) return
      const { syncing, hasError } = await res.json() as { syncing: boolean; hasError: boolean }

      if (syncing && statusRef.current === "idle") {
        statusRef.current = "syncing"
        setSyncState("loading")
      }
      if (!syncing && statusRef.current === "syncing") {
        statusRef.current = "done"
        stopPolling()
        const finalState: SyncState = hasError ? "error" : "success"
        setSyncState(finalState)
        router.refresh()
        dismissRef.current = setTimeout(() => {
          setSyncState(null)
          // Allow detecting a future sync
          statusRef.current = "idle"
          pollingRef.current = setInterval(check, POLL_INTERVAL_MS)
        }, DISMISS_AFTER_MS)
      }
    } catch {
      // keep polling on network error
    }
  }

  useEffect(() => {
    check()
    pollingRef.current = setInterval(check, POLL_INTERVAL_MS)
    return () => {
      stopPolling()
      if (dismissRef.current) clearTimeout(dismissRef.current)
    }
  }, [])

  if (!syncState) return null

  return (
    <div className="fixed bottom-8 left-4 md:left-[86px] z-50 w-80">
      <SyncToastContent state={syncState} />
    </div>
  )
}
