"use client"

import * as React from "react"
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  RotateCcw,
  Check,
  ChevronDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/database"
import { formatDueDate, PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/tasks/utils"

interface TaskItemCardProps {
  task: Task
  startISO: string
  endISO: string
  timeZone?: string
  onToggleStatus: (taskId: string, currentStatus: TaskStatus) => void
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  isPending?: boolean
}

export function TaskItemCard({
  task,
  startISO,
  endISO,
  timeZone = "Asia/Kolkata",
  onToggleStatus,
  onUpdateStatus,
  onEdit,
  onDelete,
  isPending = false,
}: TaskItemCardProps) {
  const isCompleted = task.status === "completed"
  const isCancelled = task.status === "cancelled"
  const isInProgress = task.status === "in_progress"

  const { label: dueLabel, isOverdue, isToday } = formatDueDate(
    task.due_at,
    startISO,
    endISO,
    timeZone
  )

  const priorityConf = PRIORITY_CONFIG[task.priority]
  const statusConf = STATUS_CONFIG[task.status]

  return (
    <div
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-all shadow-2xs",
        isCompleted && "opacity-65 bg-muted/20 border-border/40",
        isCancelled && "opacity-50 bg-muted/15 border-border/30",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      {/* Left side: Status toggle checkbox + Title & metadata */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Toggle Complete / Reopen Button */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id, task.status)}
          disabled={isPending}
          aria-label={
            isCompleted
              ? `Reopen "${task.title}"`
              : `Mark "${task.title}" as completed`
          }
          className={cn(
            "mt-0.5 sm:mt-0 size-5.5 rounded-md border border-border hover:border-foreground flex items-center justify-center transition-all shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
            isCompleted && "border-emerald-500/60 bg-emerald-500/15 text-emerald-500",
            isInProgress && "border-amber-500/60 bg-amber-500/10 text-amber-500",
            isCancelled && "border-border/60 bg-muted/40 text-muted-foreground line-through"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/20" />
          ) : isInProgress ? (
            <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
          ) : (
            <Circle className="size-3 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
          )}
        </button>

        {/* Title, description, and tags */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              onClick={() => onEdit(task)}
              className={cn(
                "text-sm font-medium tracking-tight hover:underline cursor-pointer transition-all truncate",
                isCompleted && "line-through text-muted-foreground decoration-muted-foreground/60",
                isCancelled && "line-through text-muted-foreground/60"
              )}
            >
              {task.title}
            </span>
          </div>

          {/* Description Snippet */}
          {task.description && (
            <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5 font-normal">
              {task.description}
            </p>
          )}

          {/* Metadata chips (due date, priority mobile tags) */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-mono text-muted-foreground">
            {/* Due Date Indicator */}
            {dueLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 text-[10px]",
                  isOverdue && !isCompleted && !isCancelled && "border-destructive/40 bg-destructive/10 text-destructive font-semibold",
                  isToday && !isCompleted && !isCancelled && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                )}
              >
                {isOverdue && !isCompleted && !isCancelled ? (
                  <AlertCircle className="size-2.5 shrink-0" />
                ) : (
                  <Calendar className="size-2.5 shrink-0" />
                )}
                <span>{dueLabel}</span>
              </span>
            )}

            {/* In Progress indicator tag */}
            {isInProgress && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="size-2.5" />
                <span>In Progress</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Badges & Dropdown Action Menu */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {/* Status Dropdown Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 text-[10px] font-mono hover:bg-muted transition-colors cursor-pointer"
              />
            }
          >
            <span>{statusConf.label}</span>
            <ChevronDown className="size-2.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onUpdateStatus(task.id, "todo")}>
              {task.status === "todo" && <Check className="size-3 mr-1 text-primary" />}
              <span>To Do</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus(task.id, "in_progress")}>
              {task.status === "in_progress" && <Check className="size-3 mr-1 text-amber-500" />}
              <span>In Progress</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus(task.id, "completed")}>
              {task.status === "completed" && <Check className="size-3 mr-1 text-emerald-500" />}
              <span>Completed</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus(task.id, "cancelled")}>
              {task.status === "cancelled" && <Check className="size-3 mr-1 text-muted-foreground" />}
              <span>Cancelled</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Badge */}
        <Badge
          variant={priorityConf.badgeVariant}
          className="text-[10px] uppercase font-mono px-2 py-0 h-5"
        >
          {priorityConf.label}
        </Badge>

        {/* More Actions Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Task options"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="size-3.5 mr-2" />
              <span>Edit Details</span>
            </DropdownMenuItem>
            {isCompleted ? (
              <DropdownMenuItem onClick={() => onToggleStatus(task.id, task.status)}>
                <RotateCcw className="size-3.5 mr-2 text-primary" />
                <span>Reopen Task</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onToggleStatus(task.id, task.status)}>
                <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" />
                <span>Mark Complete</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="size-3.5 mr-2" />
              <span>Delete Task</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
