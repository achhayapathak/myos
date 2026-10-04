"use client"

import * as React from "react"
import {
  Archive,
  RotateCcw,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { HabitWithStats } from "@/lib/habits/types"
import { HabitStats } from "./HabitStats"
import { HabitHistory } from "./HabitHistory"
import { toggleHabitArchive, deleteHabit } from "@/app/(app)/habits/actions"

export interface HabitDetailProps {
  habit: HabitWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (habit: HabitWithStats) => void
  todayDate: string
}

export function HabitDetail({
  habit,
  open,
  onOpenChange,
  onEdit,
  todayDate,
}: HabitDetailProps) {
  const [isPending, startTransition] = React.useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  if (!habit) return null

  const handleToggleArchive = () => {
    startTransition(async () => {
      const res = await toggleHabitArchive(habit.id, !habit.archived)
      if (res.success) {
        onOpenChange(false)
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteHabit(habit.id)
      if (res.success) {
        setShowDeleteConfirm(false)
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 rounded-xl bg-popover ring-1 ring-foreground/10 shadow-xl"
        showCloseButton={true}
      >
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
              {habit.scheduleLabel}
            </span>
            {habit.archived && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                Archived
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {habit.name}
          </DialogTitle>
          {habit.description && (
            <DialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
              {habit.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Streak & Consistency Stats */}
          <HabitStats
            currentStreak={habit.currentStreak}
            longestStreak={habit.longestStreak}
            completionRate={habit.completionRate}
          />

          {/* Calendar Heatmap History */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10">
            <HabitHistory
              habit={habit}
              completedDates={habit.completedDates}
              todayDate={todayDate}
              initialRange={30}
            />
          </div>

          {/* Delete Confirmation View */}
          {showDeleteConfirm ? (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 flex flex-col gap-2">
              <span className="text-xs font-semibold text-destructive">
                Are you sure you want to permanently delete &ldquo;{habit.name}&rdquo;?
              </span>
              <span className="text-[11px] text-muted-foreground">
                This will delete all associated completion history records. We recommend archiving instead.
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(habit)
                  }}
                  className="gap-1.5"
                >
                  <Edit2 className="size-3.5 text-muted-foreground" />
                  <span>Edit</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleArchive}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : habit.archived ? (
                    <RotateCcw className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Archive className="size-3.5 text-muted-foreground" />
                  )}
                  <span>{habit.archived ? "Restore Habit" : "Archive Habit"}</span>
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 text-xs"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
