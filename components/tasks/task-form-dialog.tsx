"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Task, TaskPriority, TaskStatus } from "@/types/database"
import { createTask, updateTask } from "@/app/(app)/tasks/actions"
import { AlertCircle, Calendar, Clock, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskToEdit?: Task | null
  timeZone?: string
  onSuccess?: (savedTask: Task) => void
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-blue-500 hover:bg-blue-500/10 border-blue-500/30" },
  { value: "medium", label: "Medium", color: "text-amber-500 hover:bg-amber-500/10 border-amber-500/30" },
  { value: "high", label: "High", color: "text-red-500 hover:bg-red-500/10 border-red-500/30" },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function getInitialDateStrings(dueAt: string | null | undefined): { date: string; time: string } {
  if (!dueAt) return { date: "", time: "" }
  const d = new Date(dueAt)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")

  return {
    date: `${year}-${month}-${day}`,
    time: hours !== "00" || minutes !== "00" ? `${hours}:${minutes}` : "",
  }
}

interface InnerFormProps {
  taskToEdit?: Task | null
  onOpenChange: (open: boolean) => void
  onSuccess?: (savedTask: Task) => void
}

function TaskFormContent({ taskToEdit, onOpenChange, onSuccess }: InnerFormProps) {
  const isEditing = Boolean(taskToEdit)
  const initialDates = getInitialDateStrings(taskToEdit?.due_at)

  const [title, setTitle] = React.useState(taskToEdit?.title || "")
  const [description, setDescription] = React.useState(taskToEdit?.description || "")
  const [priority, setPriority] = React.useState<TaskPriority>(taskToEdit?.priority || "medium")
  const [status, setStatus] = React.useState<TaskStatus>(taskToEdit?.status || "todo")
  const [dueDateStr, setDueDateStr] = React.useState(initialDates.date)
  const [dueTimeStr, setDueTimeStr] = React.useState(initialDates.time)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    setDueDateStr(`${year}-${month}-${day}`)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage("Task title cannot be empty.")
      return
    }

    if (trimmedTitle.length > 255) {
      setErrorMessage("Task title must be 255 characters or fewer.")
      return
    }

    let dueAtIso: string | null = null
    if (dueDateStr) {
      const timePart = dueTimeStr ? `${dueTimeStr}:00` : "23:59:59"
      const localDate = new Date(`${dueDateStr}T${timePart}`)
      if (isNaN(localDate.getTime())) {
        setErrorMessage("Invalid due date or time format.")
        return
      }
      dueAtIso = localDate.toISOString()
    }

    setIsSubmitting(true)

    try {
      if (isEditing && taskToEdit) {
        const res = await updateTask({
          id: taskToEdit.id,
          title: trimmedTitle,
          description: description.trim() || null,
          priority,
          status,
          due_at: dueAtIso,
        })

        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Failed to update task.")
          setIsSubmitting(false)
          return
        }

        onSuccess?.(res.data)
        onOpenChange(false)
      } else {
        const res = await createTask({
          title: trimmedTitle,
          description: description.trim() || null,
          priority,
          status,
          due_at: dueAtIso,
        })

        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Failed to create task.")
          setIsSubmitting(false)
          return
        }

        onSuccess?.(res.data)
        onOpenChange(false)
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving the task.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <DialogContent
      className="sm:max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
          <Sparkles className="size-3.5 text-primary" />
          <span>{isEditing ? "Edit Task" : "New Task"}</span>
        </div>
        <DialogTitle className="text-xl font-bold tracking-tight">
          {isEditing ? "Edit Task" : "Create Task"}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {isEditing
            ? "Update details, priority, due date, or task status."
            : "Capture a task with priority, due date, and detailed notes."}
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-destructive/30 bg-destructive/10 text-destructive font-mono">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-title"
            className="text-xs font-medium text-foreground flex items-center justify-between"
          >
            <span>Title <span className="text-destructive">*</span></span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {title.length}/255
            </span>
          </label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            disabled={isSubmitting}
            maxLength={255}
            className="text-base sm:text-sm font-medium"
          />
        </div>

        {/* Description Textarea */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-description"
            className="text-xs font-medium text-foreground flex items-center justify-between"
          >
            <span>Description</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Optional
            </span>
          </label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add additional details, links, or context..."
            disabled={isSubmitting}
            maxLength={2000}
            rows={3}
            className="text-base sm:text-xs font-normal"
          />
        </div>

        {/* Priority Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Priority</span>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none touch-manipulation min-h-[36px]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Status</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STATUSES.map((s) => {
              const isSelected = status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs transition-all cursor-pointer select-none text-center truncate touch-manipulation min-h-[36px]",
                    isSelected
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>Due Date & Time</span>
            </span>
            {dueDateStr && (
              <button
                type="button"
                onClick={() => {
                  setDueDateStr("")
                  setDueTimeStr("")
                }}
                className="text-[11px] font-mono text-muted-foreground hover:text-destructive transition-colors cursor-pointer touch-manipulation"
              >
                Clear date
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              type="date"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
              disabled={isSubmitting}
              className="text-base sm:text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground shrink-0" />
              <Input
                type="time"
                value={dueTimeStr}
                onChange={(e) => setDueTimeStr(e.target.value)}
                disabled={isSubmitting || !dueDateStr}
                placeholder="Optional time"
                className="text-base sm:text-xs"
              />
            </div>
          </div>

          {/* Quick date shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-muted-foreground">
            <span className="text-[10px] uppercase mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="px-2.5 py-1 min-h-[30px] rounded border border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground transition-colors cursor-pointer touch-manipulation"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 min-h-[30px] rounded border border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground transition-colors cursor-pointer touch-manipulation"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="px-2.5 py-1 min-h-[30px] rounded border border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground transition-colors cursor-pointer touch-manipulation"
            >
              Next Week
            </button>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 flex flex-row items-center justify-between sm:justify-between gap-2 border-t border-border/40">
          <span className="hidden sm:inline-block text-[11px] font-mono text-muted-foreground">
            Tip: <kbd className="px-1 py-0.5 rounded bg-muted border border-border">⌘↵</kbd> to save
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="gap-1.5 font-medium"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Task"}</span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function TaskFormDialog({
  open,
  onOpenChange,
  taskToEdit,
  onSuccess,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <TaskFormContent
          key={taskToEdit?.id ?? "new-task"}
          taskToEdit={taskToEdit}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  )
}
