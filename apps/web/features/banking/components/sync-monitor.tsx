"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { SyncToastContent } from "./bank-sync-toast"

const TOAST_ID = "bank-sync"
const POLL_INTERVAL_MS = 3000
const DEV_PREVIEW = true // set to false once design is approved

export function SyncMonitor() {
  const status = useRef<"idle" | "syncing" | "done">("idle")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function check() {
    try {
      const res = await fetch("/api/banking/sync-status")
      if (!res.ok) return
      const { syncing, hasError } = await res.json() as { syncing: boolean; hasError: boolean }

      if (syncing && status.current === "idle") {
        status.current = "syncing"
        toast.custom(() => <SyncToastContent state="loading" />, {
          id: TOAST_ID,
          duration: Infinity,
          position: "bottom-left",
        })
      }

      if (!syncing && status.current === "syncing") {
        status.current = "done"
        stopPolling()
        toast.custom(() => <SyncToastContent state={hasError ? "error" : "success"} />, {
          id: TOAST_ID,
          duration: 6000,
          position: "bottom-left",
        })
      }

      if (!syncing && status.current === "idle") {
        stopPolling()
      }
    } catch {
      // network error — keep polling
    }
  }

  useEffect(() => {
    if (DEV_PREVIEW) {
      status.current = "syncing"
      toast.custom(() => <SyncToastContent state="loading" />, {
        id: TOAST_ID,
        duration: Infinity,
        position: "bottom-left",
      })
      const t = setTimeout(() => {
        toast.custom(() => <SyncToastContent state="success" />, {
          id: TOAST_ID,
          duration: 6000,
          position: "bottom-left",
        })
      }, 6000)
      return () => clearTimeout(t)
    }

    check()
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS)
    return () => stopPolling()
  }, [])

  return null
}
