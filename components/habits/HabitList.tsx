"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { HabitsPageData, HabitWithStats } from "@/lib/habits/types"
import { HabitItem } from "./HabitItem"
import { HabitCard } from "./HabitCard"
import { HabitDetail } from "./HabitDetail"
import { HabitForm } from "./HabitForm"
import { HabitEmptyState } from "./HabitEmptyState"
import type { Habit } from "@/types/database"

export interface HabitListProps {
  initialData: HabitsPageData
}

export function HabitList({ initialData }: HabitListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const isNew = searchParams.get("new") === "true"
  const [activeTab, setActiveTab] = React.useState<"today" | "all" | "archived">("today")
  const [manualCreateOpen, setManualCreateOpen] = React.useState(false)
  const createDialogOpen = manualCreateOpen || isNew

  const setCreateDialogOpen = React.useCallback(
    (open: boolean) => {
      setManualCreateOpen(open)
      if (!open && isNew) {
        router.replace("/habits")
      }
    },
    [isNew, router]
  )

  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null)
  const [selectedDetailHabit, setSelectedDetailHabit] = React.useState<HabitWithStats | null>(null)

  // Listen for custom event from command palette
  React.useEffect(() => {
    const handleCustomCreate = () => setManualCreateOpen(true)
    window.addEventListener("myos:create-habit", handleCustomCreate)
    return () => window.removeEventListener("myos:create-habit", handleCustomCreate)
  }, [])

  const {
    todayDate,
    formattedTodayDate,
    activeHabits,
    archivedHabits,
    todayScheduledHabits,
    completedTodayCount,
    totalScheduledTodayCount,
  } = initialData

  const hasAnyHabits = activeHabits.length > 0 || archivedHabits.length > 0

  if (!hasAnyHabits) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Habits</h1>
          <p className="text-xs text-muted-foreground font-mono">{formattedTodayDate}</p>
        </div>

        <HabitEmptyState onCreateHabit={() => setCreateDialogOpen(true)} />

        <HabitForm
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            router.refresh()
          }}
        />
      </div>
    )
  }

  const handleEdit = (habit: HabitWithStats) => {
    setEditingHabit(habit)
    setCreateDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header with Date & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Habits</h1>
            {totalScheduledTodayCount > 0 && (
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                {completedTodayCount} / {totalScheduledTodayCount} completed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">{formattedTodayDate}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium touch-manipulation",
                activeTab === "today"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Today ({todayScheduledHabits.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium touch-manipulation",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({activeHabits.length})
            </button>
            {archivedHabits.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("archived")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium touch-manipulation flex items-center gap-1",
                  activeTab === "archived"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Archive className="size-3" />
                <span>Archived ({archivedHabits.length})</span>
              </button>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingHabit(null)
              setCreateDialogOpen(true)
            }}
            className="gap-1.5 shadow-2xs cursor-pointer font-medium"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Habit</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* 2. Today's Habits View (Default) */}
      {activeTab === "today" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
              Today&apos;s Schedule
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {completedTodayCount} of {totalScheduledTodayCount} completed
            </span>
          </div>

          {todayScheduledHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/80 bg-muted/15 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                No habits scheduled for today!
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                You have no active habits due on this day of the week.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingHabit(null)
                  setCreateDialogOpen(true)
                }}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                <span>Create a daily habit</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayScheduledHabits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  completedOn={todayDate}
                  isCompleted={habit.isCompletedToday}
                  onSelect={() => setSelectedDetailHabit(habit)}
                  onToggle={() => router.refresh()}
                  showStreak={true}
                />
              ))}
            </div>
          )}

          {/* Quick info footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground/70 font-mono pt-2 border-t border-border/40">
            <span>Tap circle to mark complete • Tap row to inspect details & streaks</span>
          </div>
        </div>
      )}

      {/* 3. All Active Habits (Cards Grid) */}
      {activeTab === "all" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
              All Active Habits ({activeHabits.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                todayDate={todayDate}
                onSelect={() => setSelectedDetailHabit(habit)}
                onToggle={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Archived Habits */}
      {activeTab === "archived" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
              Archived Habits ({archivedHabits.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Archived habits preserve all historical completions and streaks.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {archivedHabits.map((habit) => (
              <div
                key={habit.id}
                onClick={() => setSelectedDetailHabit(habit)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedDetailHabit(habit)
                  }
                }}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/15 text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {habit.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {habit.scheduleLabel} • {habit.longestStreak}d best streak
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/40">
                    Archived
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit Create / Edit Dialog */}
      <HabitForm
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setEditingHabit(null)
        }}
        habit={editingHabit}
        onSuccess={() => {
          router.refresh()
        }}
      />

      {/* Habit Detail Sheet / Dialog */}
      <HabitDetail
        habit={selectedDetailHabit}
        open={Boolean(selectedDetailHabit)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailHabit(null)
        }}
        onEdit={handleEdit}
        todayDate={todayDate}
      />
    </div>
  )
}
