"use client"

import * as React from "react"
import { Flame, ChevronRight, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { HabitCompletionButton } from "./HabitCompletionButton"
import { formatHabitReminderTime } from "@/lib/habits/calculations"
import type { HabitWithStats, TodayHabitItem } from "@/lib/habits/types"

export interface HabitItemProps {
  habit: HabitWithStats | TodayHabitItem
  completedOn: string
  isCompleted: boolean
  onSelect?: () => void
  onToggle?: (nextCompleted: boolean) => void
  showStreak?: boolean
  className?: string
}

export function HabitItem({
  habit,
  completedOn,
  isCompleted,
  onSelect,
  onToggle,
  showStreak = true,
  className,
}: HabitItemProps) {
  const currentStreak = habit.currentStreak || 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      // If pressing space or enter on the container (and not on the button)
      if (e.target === e.currentTarget && onSelect) {
        e.preventDefault()
        onSelect()
      }
    }
  }

  return (
    <div
      role={onSelect ? "button" : "listitem"}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 select-none touch-manipulation",
        onSelect ? "cursor-pointer hover:border-foreground/30 hover:bg-muted/30 active:scale-[0.99]" : "",
        isCompleted
          ? "bg-muted/20 border-border/50 text-muted-foreground"
          : "bg-background border-border/70 text-foreground shadow-2xs",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Left: Completion toggle + Habit Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <HabitCompletionButton
          habitId={habit.id}
          habitName={habit.name}
          completedOn={completedOn}
          isCompleted={isCompleted}
          onToggle={onToggle}
        />

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium tracking-tight truncate transition-all",
                isCompleted && "line-through text-muted-foreground opacity-80"
              )}
            >
              {habit.name}
            </span>
            {habit.reminder_time && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground shrink-0">
                <Bell className="size-2.5" />
                <span>{formatHabitReminderTime(habit.reminder_time)}</span>
              </span>
            )}
          </div>

          {habit.description && (
            <span className="text-xs text-muted-foreground truncate leading-relaxed">
              {habit.description}
            </span>
          )}
        </div>
      </div>

      {/* Right: Streak & Detail Chevron */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        {showStreak && currentStreak > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium border border-border/60 bg-muted/40 text-muted-foreground"
            title={`${currentStreak} scheduled completions in a row`}
            aria-label={`${currentStreak} day streak`}
          >
            <Flame className="size-3 text-amber-500 fill-amber-500/20" />
            <span>{currentStreak}d</span>
          </span>
        )}

        {onSelect && (
          <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </div>
  )
}
