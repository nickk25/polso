"use client"

import { ArrowsClockwise, CheckCircle, WarningCircle } from "@phosphor-icons/react"

export type SyncState = "loading" | "success" | "error"

export function SyncToastContent({ state }: { state: SyncState }) {
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card px-6 py-7 shadow-xl flex flex-col items-center gap-5 text-center">
      {/* Icon */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        {state === "loading" ? (
          <>
            {/* Outer ping */}
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
            {/* Slow dashed orbit */}
            <div className="absolute inset-1 rounded-full border-2 border-dashed border-primary/20 animate-spin [animation-duration:10s]" />
            {/* Counter-rotating inner ring */}
            <div className="absolute inset-4 rounded-full border-2 border-primary/50 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
            {/* Center glow */}
            <div className="absolute inset-[26px] rounded-full bg-primary/20 blur-[6px]" />
            {/* Icon */}
            <ArrowsClockwise
              className="relative h-7 w-7 text-primary animate-spin [animation-duration:2s]"
              weight="bold"
            />
          </>
        ) : state === "success" ? (
          <>
            <div className="absolute inset-0 rounded-full bg-green-500/10" />
            <CheckCircle className="h-12 w-12 text-green-500" weight="fill" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/10" />
            <WarningCircle className="h-12 w-12 text-red-500" weight="fill" />
          </>
        )}
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {state === "loading"
            ? "Syncing transactions…"
            : state === "success"
            ? "All synced!"
            : "Sync failed"}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {state === "loading"
            ? "Fetching your full bank history.\nThis may take a minute."
            : state === "success"
            ? "Your transaction history is ready to explore."
            : "Something went wrong. Please try syncing again."}
        </p>
      </div>

      {/* Bar — always rendered so both states are the same height */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {state === "loading" && (
          <div className="h-full w-1/2 rounded-full bg-primary/60 animate-[shimmer_1.5s_ease-in-out_infinite]" />
        )}
      </div>
    </div>
  )
}
