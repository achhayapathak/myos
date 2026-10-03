"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DigitalClockProps {
  timeZone?: string
  className?: string
}

export function formatDigitalClock(date: Date, timeZone = "Asia/Kolkata") {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    const parts = formatter.formatToParts(date)
    const hour = (parts.find((p) => p.type === "hour")?.value ?? "12").padStart(2, "0")
    const minute = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0")
    const meridiem = (parts.find((p) => p.type === "dayPeriod")?.value ?? "AM").toUpperCase()
    return { hour, minute, meridiem, formatted: `${hour}:${minute} ${meridiem}` }
  } catch {
    return { hour: "--", minute: "--", meridiem: "--", formatted: "--:--" }
  }
}

function subscribeToClock(callback: () => void) {
  const interval = setInterval(callback, 1000)
  return () => clearInterval(interval)
}

function getClockSnapshot() {
  return Date.now()
}

const SERVER_TIME = Date.now()
function getServerSnapshot() {
  return SERVER_TIME
}

export function DigitalClock({
  timeZone = "Asia/Kolkata",
  className,
}: DigitalClockProps) {
  const timestamp = React.useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerSnapshot
  )

  const { hour, minute, meridiem } = formatDigitalClock(new Date(timestamp), timeZone)
  const tzLabel = timeZone === "Asia/Kolkata" ? "IST" : timeZone.split("/")[1]?.replace(/_/g, " ") ?? "IST"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card/80 dark:bg-card/40 backdrop-blur-xs shadow-2xs font-mono select-none",
        className
      )}
      title={`Current time in ${timeZone} (${tzLabel})`}
      aria-label={`Digital clock: ${hour}:${minute} ${meridiem} (${timeZone})`}
      suppressHydrationWarning
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="size-3.5 text-amber-500" />
      </div>

      <div className="flex items-baseline gap-1" suppressHydrationWarning>
        <span className="text-base sm:text-lg font-bold tracking-wider text-foreground tabular-nums">
          {hour}
          <span className="text-primary/70 animate-pulse mx-0.5">:</span>
          {minute}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {meridiem}
        </span>
      </div>

      <span className="text-[9px] font-mono font-medium text-muted-foreground/80 uppercase tracking-widest pl-1.5 border-l border-border/60">
        {tzLabel}
      </span>
    </div>
  )
}
