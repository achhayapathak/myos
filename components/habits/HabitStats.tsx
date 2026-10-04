import * as React from "react"
import { Flame, Trophy, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HabitStatsProps {
  currentStreak: number
  longestStreak: number
  completionRate: number
  className?: string
  compact?: boolean
}

export function HabitStats({
  currentStreak,
  longestStreak,
  completionRate,
  className,
  compact = false,
}: HabitStatsProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
        <span
          className="inline-flex items-center gap-1 font-mono font-medium"
          title={`Current streak: ${currentStreak} days`}
          aria-label={`Current streak: ${currentStreak} days`}
        >
          <Flame className={cn("size-3.5", currentStreak > 0 ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground")} />
          <span>{currentStreak}d</span>
        </span>
        <span className="text-border/80">•</span>
        <span
          className="inline-flex items-center gap-1 font-mono font-medium"
          title={`Longest streak: ${longestStreak} days`}
          aria-label={`Longest streak: ${longestStreak} days`}
        >
          <Trophy className="size-3 text-muted-foreground" />
          <span>{longestStreak}d best</span>
        </span>
        <span className="text-border/80">•</span>
        <span
          className="inline-flex items-center gap-1 font-mono font-medium"
          title={`30-day completion rate: ${completionRate}%`}
          aria-label={`30-day completion rate: ${completionRate}%`}
        >
          <TrendingUp className="size-3 text-muted-foreground" />
          <span>{completionRate}%</span>
        </span>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2.5 sm:gap-3", className)}>
      {/* Current Streak */}
      <div className="flex flex-col p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Flame
            className={cn(
              "size-4 shrink-0",
              currentStreak > 0 ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground"
            )}
            aria-hidden="true"
          />
          <span className="font-medium text-[11px] uppercase tracking-wider font-mono">Current</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {currentStreak}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {/* Longest Streak */}
      <div className="flex flex-col p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Trophy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium text-[11px] uppercase tracking-wider font-mono">Longest</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {longestStreak}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {longestStreak === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="flex flex-col p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <TrendingUp className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium text-[11px] uppercase tracking-wider font-mono">Rate (30d)</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {completionRate}%
          </span>
        </div>
      </div>
    </div>
  )
}
