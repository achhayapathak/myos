"use client"

import * as React from "react"
import {
  Coffee,
  CheckCircle2,
  Zap,
  Pause,
} from "lucide-react"
import type { PomodoroType } from "@/types/database"
import type { PomodoroState } from "@/lib/focus/timer-utils"
import { formatTimerDisplay } from "@/lib/focus/timer-utils"
import { cn } from "@/lib/utils"

interface PomodoroTimerDisplayProps {
  state: PomodoroState
  remainingSeconds: number
  durationSeconds: number
  type: PomodoroType
  taskTitle?: string | null
}

export function PomodoroTimerDisplay({
  state,
  remainingSeconds,
  durationSeconds,
  type,
  taskTitle,
}: PomodoroTimerDisplayProps) {
  const formattedTime = formatTimerDisplay(remainingSeconds)

  // Calculate SVG circular stroke progress
  const progressRatio =
    durationSeconds > 0
      ? Math.min(1, Math.max(0, 1 - remainingSeconds / durationSeconds))
      : 0

  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progressRatio)

  const isBreak = type === "short_break" || type === "long_break"
  const isComplete = state === "FOCUS_COMPLETE" || state === "BREAK_COMPLETE"
  const isActive = state === "FOCUSING" || state === "SHORT_BREAK"
  const isPaused = state === "PAUSED"
  const isLongFocus = type === "focus" && durationSeconds >= 45 * 60

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* SVG Circular Progress Ring */}
      <div className="relative flex items-center justify-center max-w-full">
        <svg
          className="size-52 xs:size-60 sm:size-72 -rotate-90 transform max-w-full"
          viewBox="0 0 280 280"
        >
          {/* Background circle track */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            className="stroke-muted/40 fill-none"
            strokeWidth="8"
          />

          {/* Animated active progress stroke */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            className={cn(
              "fill-none transition-all duration-300 ease-out",
              isComplete
                ? "stroke-emerald-500"
                : isPaused
                ? "stroke-amber-500/80"
                : isBreak
                ? "stroke-sky-500"
                : "stroke-primary"
            )}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center content inside ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6">
          {/* State / Mode Badge */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            {isComplete ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : isPaused ? (
              <Pause className="size-3.5 text-amber-500" />
            ) : isBreak ? (
              <Coffee className="size-3.5 text-sky-500" />
            ) : (
              <Zap className="size-3.5 text-amber-500" />
            )}
            <span>
              {isPaused
                ? `${isBreak ? (type === "short_break" ? "Short Break" : "Long Break") : isLongFocus ? "Long Focus" : "Short Focus"} (Paused)`
                : state === "FOCUS_COMPLETE"
                ? "Focus Complete"
                : state === "BREAK_COMPLETE"
                ? "Break Complete"
                : isBreak
                ? type === "short_break"
                  ? "Short Break"
                  : "Long Break"
                : isLongFocus
                ? "Long Focus"
                : "Short Focus"}
            </span>
          </div>

          {/* Large Countdown Display */}
          <div
            className={cn(
              "text-4xl xs:text-5xl sm:text-6xl font-mono font-bold tracking-tighter tabular-nums transition-colors",
              isComplete
                ? "text-emerald-500"
                : isPaused
                ? "text-amber-500"
                : isActive
                ? "text-foreground"
                : "text-foreground/90"
            )}
          >
            {formattedTime}
          </div>

          {/* Helper Subtext */}
          <p className="text-[11px] font-mono text-muted-foreground mt-2 max-w-[200px] truncate">
            {isPaused
              ? "Paused • Click Resume to continue"
              : state === "IDLE"
              ? isBreak
                ? type === "short_break"
                  ? "5m quick recharge"
                  : "15m recovery break"
                : isLongFocus
                ? "50m deep focus session"
                : "25m deep focus session"
              : state === "FOCUSING"
              ? taskTitle ? `Task: ${taskTitle}` : "Focusing without distraction"
              : state === "SHORT_BREAK"
              ? "Rest your eyes & stretch"
              : state === "FOCUS_COMPLETE"
              ? "Great job! Time for a break."
              : "Break finished. Ready?"}
          </p>
        </div>
      </div>
    </div>
  )
}
