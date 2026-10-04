import Link from "next/link"
import { Timer, Play, Pause, Flame, CheckCircle, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FocusSummary } from "@/lib/today-utils"

interface FocusStatusCardProps {
  summary: FocusSummary
}

export function FocusStatusCard({ summary }: FocusStatusCardProps) {
  const { activeSession, completedSessionsToday, totalFocusMinutesToday } = summary
  const isPaused = Boolean(activeSession?.paused_at)

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              Focus & Pomodoro
            </h2>
          </div>
          {activeSession ? (
            isPaused ? (
              <Badge
                variant="outline"
                className="text-[10px] font-mono h-4.5 px-2 text-amber-500 border-amber-500/40 bg-amber-500/10 gap-1"
              >
                <Pause className="size-2.5" />
                <span>Paused</span>
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="text-[10px] font-mono h-4.5 px-2 bg-emerald-600 gap-1 animate-pulse"
              >
                <Radio className="size-2.5" />
                <span>In Focus</span>
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono h-4.5 px-1.5">
              Ready
            </Badge>
          )}
        </div>

        {activeSession ? (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div className="text-4xl font-mono font-bold tracking-tight text-foreground tabular-nums">
              {Math.round(activeSession.duration_seconds / 60)}:00
            </div>
            <p className="text-xs font-medium text-foreground mt-1.5">
              {activeSession.type === "focus"
                ? activeSession.duration_seconds >= 45 * 60
                  ? isPaused ? "Paused Long Focus (50m)" : "Active Long Focus (50m)"
                  : isPaused ? "Paused Short Focus (25m)" : "Active Short Focus (25m)"
                : activeSession.type === "short_break"
                ? isPaused ? "Paused Short Break (5m)" : "Active Short Break (5m)"
                : isPaused ? "Paused Long Break (15m)" : "Active Long Break (15m)"}
            </p>
            {activeSession.task_title && (
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate max-w-[220px]">
                Task: {activeSession.task_title}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div className="text-4xl font-mono font-bold tracking-tight text-foreground">
              25:00
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              Short Focus (25m) or Long Focus (50m)
            </p>
          </div>
        )}

        {/* Daily Stats Summary */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
            <CheckCircle className="size-3.5 text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold font-mono text-foreground leading-tight">
                {completedSessionsToday}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground uppercase">
                Completed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
            <Flame className="size-3.5 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold font-mono text-foreground leading-tight">
                {totalFocusMinutesToday}m
              </span>
              <span className="text-[9px] font-mono text-muted-foreground uppercase">
                Focused Time
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-border/40 flex flex-col gap-1.5">
        <Link
          href="/focus"
          className={cn(
            buttonVariants({ variant: activeSession ? "default" : "default", size: "sm" }),
            "w-full gap-2 font-mono text-xs"
          )}
        >
          <Play className="size-3.5 fill-current" />
          <span>
            {activeSession
              ? isPaused
                ? "Resume Paused Session"
                : "Resume Focus Session"
              : "Start Focus Session"}
          </span>
        </Link>
        <span className="text-[10px] font-mono text-center text-muted-foreground/60">
          Press ⌥3 to jump to timer
        </span>
      </div>
    </div>
  )
}
