"use client"

import * as React from "react"
import { Check, Clock, AlertCircle, Edit2, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Reminder } from "@/types/database"
import type { ReminderWithMeta } from "@/lib/reminders/types"
import { toggleReminderCompleted, deleteReminder } from "@/app/(app)/reminders/actions"

interface ReminderItemProps {
  reminder: ReminderWithMeta
  onEdit: (reminder: Reminder) => void
  onToggleComplete?: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
}

export function ReminderItem({
  reminder,
  onEdit,
  onToggleComplete,
  onDelete,
}: ReminderItemProps) {
  const [isPending, startTransition] = React.useTransition()
  const isCompleted = reminder.completed
  const isPastDue = reminder.isPastDue && !isCompleted

  const handleToggle = () => {
    const nextCompleted = !isCompleted
    onToggleComplete?.(reminder.id, nextCompleted)
    startTransition(async () => {
      await toggleReminderCompleted(reminder.id, nextCompleted)
    })
  }

  const handleDelete = () => {
    onDelete?.(reminder.id)
    startTransition(async () => {
      await deleteReminder(reminder.id)
    })
  }

  return (
    <div
      className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all shadow-2xs ${
        isPastDue
          ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
          : isCompleted
          ? "border-border/40 bg-muted/10 opacity-70"
          : "border-border/60 bg-card hover:bg-muted/20 hover:border-border"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={`Mark reminder "${reminder.title}" as ${isCompleted ? "incomplete" : "complete"}`}
          className={`size-7.5 sm:size-6 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer touch-manipulation ${
            isCompleted
              ? "bg-primary border-primary text-primary-foreground"
              : isPastDue
              ? "border-destructive/60 hover:border-destructive hover:bg-destructive/10"
              : "border-muted-foreground/40 hover:border-foreground hover:bg-foreground/5"
          }`}
        >
          {isCompleted && <Check className="size-3.5 sm:size-3 stroke-[3]" />}
        </button>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium tracking-tight break-words transition-all ${
                isCompleted
                  ? "line-through text-muted-foreground"
                  : isPastDue
                  ? "text-foreground font-semibold"
                  : "text-foreground"
              }`}
            >
              {reminder.title}
            </span>

            {isPastDue && (
              <Badge
                variant="destructive"
                className="font-mono text-[10px] gap-1 px-1.5 py-0 h-4 uppercase tracking-wider"
              >
                <AlertCircle className="size-2.5" />
                <span>Past Due</span>
              </Badge>
            )}
          </div>

          {/* Time Metadata */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground/70" />
              <span>{reminder.formattedScheduledAt}</span>
            </span>

            <span>•</span>

            <span className={isPastDue ? "text-destructive font-medium" : "text-muted-foreground"}>
              {reminder.relativeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(reminder)}
          disabled={isPending}
          aria-label={`Edit reminder "${reminder.title}"`}
          className="size-8 sm:size-7 text-muted-foreground hover:text-foreground touch-manipulation"
        >
          <Edit2 className="size-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete reminder "${reminder.title}"`}
          className="size-8 sm:size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-manipulation"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
