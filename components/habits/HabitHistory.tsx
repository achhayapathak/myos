"use client"

import * as React from "react"
import { Check, X, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HabitHistoryDay } from "@/lib/habits/types"
import {
  formatHabitShortDate,
  addDays,
  getDatesInRange,
  isHabitScheduledForDate,
  getISOWeekday,
} from "@/lib/habits/calculations"
import type { Habit } from "@/types/database"

export interface HabitHistoryProps {
  habit: Pick<Habit, "frequency_type" | "target_days" | "created_at">
  completedDates: string[] | Set<string>
  todayDate: string
  className?: string
  initialRange?: 30 | 60 | 90
}

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"]

export function HabitHistory({
  habit,
  completedDates,
  todayDate,
  className,
  initialRange = 30,
}: HabitHistoryProps) {
  const [rangeDays, setRangeDays] = React.useState<30 | 60 | 90>(initialRange)

  const completedSet = React.useMemo(() => {
    return completedDates instanceof Set
      ? completedDates
      : new Set(completedDates)
  }, [completedDates])

  const days: HabitHistoryDay[] = React.useMemo(() => {
    const startDate = addDays(todayDate, -(rangeDays - 1))
    const dates = getDatesInRange(startDate, todayDate)

    return dates.map((d) => {
      const isScheduled = isHabitScheduledForDate(habit, d)
      const isCompleted = completedSet.has(d)
      const isToday = d === todayDate
      const dayOfWeek = getISOWeekday(d)

      return {
        date: d,
        dayOfWeek,
        isScheduled,
        isCompleted,
        isToday,
      }
    })
  }, [habit, completedSet, todayDate, rangeDays])

  // Leading empty slots for Monday-start alignment
  const firstDay = days[0]
  const leadingBlanks = firstDay ? firstDay.dayOfWeek - 1 : 0

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Range switcher & title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground font-mono tracking-tight uppercase">
          Consistency History ({rangeDays}d)
        </span>
        <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-mono">
          {([30, 60, 90] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeDays(r)}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer text-[11px]",
                rangeDays === r
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Weekday column headers (M, T, W, T, F, S, S) */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {WEEKDAY_HEADERS.map((w, idx) => (
          <span
            key={`wh-${idx}`}
            className="text-[11px] font-mono font-medium text-muted-foreground/70"
            aria-hidden="true"
          >
            {w}
          </span>
        ))}
      </div>

      {/* Grid of days */}
      <div
        role="grid"
        aria-label={`Habit completion history for the last ${rangeDays} days`}
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
      >
        {/* Leading blanks for offset */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" aria-hidden="true" />
        ))}

        {days.map((day) => {
          const shortDate = formatHabitShortDate(day.date)
          let stateLabel = "Not scheduled"
          if (day.isScheduled) {
            if (day.isCompleted) {
              stateLabel = "Completed"
            } else if (day.isToday) {
              stateLabel = "Today (in progress)"
            } else {
              stateLabel = "Missed"
            }
          }

          const fullLabel = `${shortDate}: ${stateLabel}`

          return (
            <div
              key={day.date}
              title={fullLabel}
              aria-label={fullLabel}
              tabIndex={0}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center p-0.5 text-[10px] font-mono transition-all border select-none group relative",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden",
                day.isToday && "ring-1 ring-foreground/60 ring-offset-1 ring-offset-background",
                // Visual distinctions not relying solely on color:
                day.isScheduled && day.isCompleted && "bg-foreground/10 border-foreground/30 text-foreground font-semibold",
                day.isScheduled && !day.isCompleted && !day.isToday && "bg-destructive/10 border-destructive/30 text-destructive",
                day.isScheduled && !day.isCompleted && day.isToday && "bg-muted/40 border-dashed border-border/80 text-foreground",
                !day.isScheduled && "bg-muted/15 border-border/30 text-muted-foreground/50"
              )}
            >
              {/* Day number */}
              <span className="text-[9px] opacity-70 leading-none">
                {parseInt(day.date.split("-")[2], 10)}
              </span>

              {/* Status Icon */}
              <div className="mt-0.5">
                {day.isScheduled ? (
                  day.isCompleted ? (
                    <Check className="size-3 text-foreground stroke-[3]" aria-hidden="true" />
                  ) : day.isToday ? (
                    <span className="size-1.5 rounded-full bg-foreground/60 animate-pulse" aria-hidden="true" />
                  ) : (
                    <X className="size-3 text-destructive stroke-[2.5]" aria-hidden="true" />
                  )
                ) : (
                  <Minus className="size-2.5 text-muted-foreground/40" aria-hidden="true" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Accessible Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] font-mono text-muted-foreground border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <div className="size-3.5 rounded bg-foreground/10 border border-foreground/30 flex items-center justify-center">
            <Check className="size-2.5 text-foreground stroke-[3]" />
          </div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3.5 rounded bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <X className="size-2.5 text-destructive stroke-[2.5]" />
          </div>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3.5 rounded bg-muted/15 border border-border/30 flex items-center justify-center">
            <Minus className="size-2 text-muted-foreground/40" />
          </div>
          <span>Unscheduled</span>
        </div>
      </div>
    </div>
  )
}
