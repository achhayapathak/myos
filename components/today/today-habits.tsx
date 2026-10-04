"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Plus, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HabitCompletionButton } from "@/components/habits/HabitCompletionButton"
import { quickCreateHabit } from "@/app/(app)/habits/actions"
import type { TodayHabitItem } from "@/lib/habits/types"

export interface TodayHabitsProps {
  initialHabits: TodayHabitItem[]
  todayDate: string
  completedCount: number
  totalCount: number
  timeZone?: string
  className?: string
}

export function TodayHabits({
  initialHabits,
  todayDate,
  completedCount,
  totalCount,
  className,
}: TodayHabitsProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = React.useState(false)
  const [newHabitName, setNewHabitName] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus()
    }
  }, [isAdding])

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newHabitName.trim()
    if (!trimmed || isPending) return

    startTransition(async () => {
      const res = await quickCreateHabit({ name: trimmed })
      if (res.success) {
        setNewHabitName("")
        setIsAdding(false)
        router.refresh()
      }
    })
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs select-none",
        className
      )}
    >
      {/* Header: Title, completed count, and link to /habits */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Habits</h2>
          {totalCount > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
              {completedCount} / {totalCount} completed
            </span>
          )}
        </div>

        <Link
          href="/habits"
          className="text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Habit items list */}
      {initialHabits.length === 0 ? (
        <div className="py-2 text-xs text-muted-foreground">
          {!isAdding && <span>No habits scheduled for today.</span>}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/40">
          {initialHabits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between py-2 first:pt-0 last:pb-0 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <HabitCompletionButton
                  habitId={habit.id}
                  habitName={habit.name}
                  completedOn={todayDate}
                  isCompleted={habit.isCompleted}
                  onToggle={() => router.refresh()}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-xs font-medium truncate transition-all",
                      habit.isCompleted && "line-through text-muted-foreground opacity-75"
                    )}
                  >
                    {habit.name}
                  </span>
                  {habit.description && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      {habit.description}
                    </span>
                  )}
                </div>
              </div>

              {habit.currentStreak > 0 && (
                <span
                  className="text-[10px] font-mono font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40 shrink-0 ml-2"
                  title={`${habit.currentStreak} day streak`}
                >
                  {habit.currentStreak}d
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline Quick Habit Creation */}
      {isAdding ? (
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 pt-1 border-t border-border/40">
          <input
            ref={inputRef}
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Type habit name (e.g. Workout)..."
            disabled={isPending}
            className="flex-1 h-8 px-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isPending || !newHabitName.trim()}
            className="h-8 px-2.5 rounded-lg bg-foreground text-background text-xs font-medium disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false)
              setNewHabitName("")
            }}
            disabled={isPending}
            className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="pt-1 border-t border-border/40 flex justify-start">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
          >
            <Plus className="size-3.5" />
            <span>Add habit</span>
          </button>
        </div>
      )}
    </div>
  )
}
