"use client"

import * as React from "react"
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/database"
import { toggleTaskStatus } from "@/app/(app)/today/actions"
import { getTaskDueLabel } from "@/lib/today-utils"

interface TaskItemProps {
  task: Task
  startISO: string
  endISO: string
  timeZone?: string
}

export function TaskItem({ task, startISO, endISO, timeZone }: TaskItemProps) {
  const [isPending, startTransition] = React.useTransition()
  const [optimisticStatus, setOptimisticStatus] = React.useOptimistic(
    task.status,
    (_current, next: TaskStatus) => next
  )

  const isCompleted = optimisticStatus === "completed"
  const { label: dueLabel, isOverdue } = getTaskDueLabel(
    task.due_at,
    startISO,
    endISO,
    timeZone
  )

  const handleToggle = () => {
    const nextStatus: TaskStatus = isCompleted ? "todo" : "completed"

    startTransition(async () => {
      setOptimisticStatus(nextStatus)
      await toggleTaskStatus(task.id, task.status)
    })
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-all shadow-2xs group",
        isCompleted && "opacity-60 bg-muted/20"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={
            isCompleted
              ? `Mark "${task.title}" as incomplete`
              : `Mark "${task.title}" as complete`
          }
          className={cn(
            "size-7 sm:size-6 rounded-md border border-border hover:border-foreground flex items-center justify-center transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer touch-manipulation",
            isCompleted && "border-emerald-500/50 bg-emerald-500/10"
          )}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle className="size-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
          )}
        </button>

        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "text-xs font-medium truncate transition-all",
              isCompleted
                ? "line-through text-muted-foreground"
                : "text-foreground"
            )}
          >
            {task.title}
          </span>

          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
            {dueLabel && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && !isCompleted && "text-destructive font-semibold"
                )}
              >
                {isOverdue && !isCompleted && <AlertCircle className="size-2.5" />}
                <span>{dueLabel}</span>
              </span>
            )}

            {task.description && (
              <>
                {dueLabel && <span>•</span>}
                <span className="truncate max-w-[200px] opacity-75">
                  {task.description}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge
          variant={
            task.priority === "high"
              ? "destructive"
              : task.priority === "medium"
              ? "secondary"
              : "outline"
          }
          className="text-[10px] uppercase font-mono px-1.5 py-0 h-4.5"
        >
          {task.priority}
        </Badge>
      </div>
    </div>
  )
}
