"use client"

import * as React from "react"
import { Flame, Trophy, TrendingUp, ChevronRight, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { HabitCompletionButton } from "./HabitCompletionButton"
import { formatHabitReminderTime } from "@/lib/habits/calculations"
import type { HabitWithStats } from "@/lib/habits/types"

export interface HabitCardProps {
  habit: HabitWithStats
  todayDate: string
  onSelect: () => void
  onToggle?: (nextCompleted: boolean) => void
  className?: string
}

export function HabitCard({
  habit,
  todayDate,
  onSelect,
  onToggle,
  className,
}: HabitCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group relative flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:border-foreground/30",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        habit.isCompletedToday && "border-border/50 bg-muted/15",
        className
      )}
    >
      {/* Top Header: Completion Button + Name & Schedule */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {habit.isScheduledToday ? (
            <HabitCompletionButton
              habitId={habit.id}
              habitName={habit.name}
              completedOn={todayDate}
              isCompleted={habit.isCompletedToday}
              onToggle={onToggle}
              className="mt-0.5"
            />
          ) : (
            <div className="size-6.5 rounded-full border border-dashed border-border/60 bg-muted/30 flex items-center justify-center shrink-0 mt-1">
              <span className="text-[10px] text-muted-foreground font-mono">—</span>
            </div>
          )}

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold text-sm tracking-tight text-foreground truncate",
                  habit.isCompletedToday && "line-through text-muted-foreground opacity-80"
                )}
              >
                {habit.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">{habit.scheduleLabel}</span>
              {habit.reminder_time && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    <Bell className="size-2.5" />
                    <span>{formatHabitReminderTime(habit.reminder_time)}</span>
                  </span>
                </>
              )}
              {habit.isScheduledToday && (
                <>
                  <span>•</span>
                  <span
                    className={cn(
                      "text-[11px] font-mono",
                      habit.isCompletedToday ? "text-foreground font-medium" : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {habit.isCompletedToday ? "Completed today" : "Due today"}
                  </span>
                </>
              )}
            </div>

            {habit.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                {habit.description}
              </p>
            )}
          </div>
        </div>

        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      {/* Bottom Metrics Bar */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5" title="Current streak">
          <Flame className={cn("size-3.5", habit.currentStreak > 0 ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground")} />
          <span className="font-medium text-foreground">{habit.currentStreak}d</span>
          <span className="text-[10px]">streak</span>
        </div>

        <div className="flex items-center gap-1.5" title="Longest streak">
          <Trophy className="size-3" />
          <span>{habit.longestStreak}d best</span>
        </div>

        <div className="flex items-center gap-1.5" title="30-day completion rate">
          <TrendingUp className="size-3" />
          <span>{habit.completionRate}%</span>
        </div>
      </div>
    </div>
  )
}
