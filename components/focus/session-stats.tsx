"use client"

import * as React from "react"
import { CheckCircle, Clock, Flame, History } from "lucide-react"
import type { PomodoroSession } from "@/types/database"
import { formatSessionLabel } from "@/lib/focus/timer-utils"

interface SessionStatsProps {
  completedSessions: (PomodoroSession & { task_title?: string | null })[]
  totalFocusMinutes: number
}

export function SessionStats({
  completedSessions,
  totalFocusMinutes,
}: SessionStatsProps) {
  const focusCount = completedSessions.filter((s) => s.type === "focus").length

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto">
      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
        <div className="p-2 sm:p-3.5 rounded-xl border border-border/70 bg-card text-center shadow-2xs">
          <div className="text-lg sm:text-2xl font-bold font-mono text-foreground flex items-center justify-center gap-1">
            <CheckCircle className="size-3.5 sm:size-4 text-emerald-500" />
            <span>{focusCount}</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
            Focus Blocks
          </div>
        </div>

        <div className="p-2 sm:p-3.5 rounded-xl border border-border/70 bg-card text-center shadow-2xs">
          <div className="text-lg sm:text-2xl font-bold font-mono text-foreground flex items-center justify-center gap-1">
            <Clock className="size-3.5 sm:size-4 text-primary" />
            <span>{totalFocusMinutes}m</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
            Focused Today
          </div>
        </div>

        <div className="p-2 sm:p-3.5 rounded-xl border border-border/70 bg-card text-center shadow-2xs">
          <div className="text-lg sm:text-2xl font-bold font-mono text-foreground flex items-center justify-center gap-1">
            <Flame className="size-3.5 sm:size-4 text-amber-500" />
            <span>{Math.round(totalFocusMinutes / 25)}</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
            Cycles Done
          </div>
        </div>
      </div>

      {/* Completed Sessions Today History */}
      {completedSessions.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground mb-3 pb-2 border-b border-border/40">
            <History className="size-3.5 text-muted-foreground" />
            <span>Today&apos;s Completed Sessions</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({completedSessions.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {completedSessions.map((s) => {
              const date = new Date(s.started_at)
              const timeStr = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              const isFocus = s.type === "focus"

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span
                      className={`size-2 rounded-full shrink-0 ${
                        isFocus ? "bg-emerald-500" : "bg-sky-500"
                      }`}
                    />
                    <span className="font-medium text-foreground truncate">
                      {formatSessionLabel(s.type, s.duration_seconds)}
                    </span>
                    {s.task_title && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        • {s.task_title}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {timeStr}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
