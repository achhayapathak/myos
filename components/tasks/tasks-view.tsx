"use client"

import * as React from "react"
import {
  CheckSquare,
  Plus,
  Keyboard,
  AlertCircle,
  Inbox,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task, TaskStatus } from "@/types/database"
import {
  deleteTask,
  toggleTaskStatus,
  updateTaskStatus,
} from "@/app/(app)/tasks/actions"
import {
  filterTasks,
  getTaskCounts,
  sortTasks,
  type TaskDueDateFilter,
  type TaskPriorityFilter,
  type TaskSortField,
  type TaskSortOrder,
  type TaskStatusFilter,
} from "@/lib/tasks/utils"
import { TaskFiltersBar } from "./task-filters-bar"
import { TaskItemCard } from "./task-item-card"
import { TaskFormDialog } from "./task-form-dialog"
import { TaskShortcutsDialog } from "./task-shortcuts-dialog"

interface TasksViewProps {
  initialTasks: Task[]
  startISO: string
  endISO: string
  timeZone?: string
  user: {
    id: string
    displayName: string | null
  }
}

export function TasksView({
  initialTasks,
  startISO,
  endISO,
  timeZone = "Asia/Kolkata",
}: TasksViewProps) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks)
  const [prevInitialTasks, setPrevInitialTasks] = React.useState(initialTasks)

  // Sync state when server passes updated initialTasks
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks)
    setTasks(initialTasks)
  }

  const [pendingTaskIds, setPendingTaskIds] = React.useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Filters & Sorting State
  const [statusFilter, setStatusFilter] = React.useState<TaskStatusFilter>("all")
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriorityFilter>("all")
  const [dueDateFilter, setDueDateFilter] = React.useState<TaskDueDateFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortField, setSortField] = React.useState<TaskSortField>("created_at")
  const [sortOrder, setSortOrder] = React.useState<TaskSortOrder>("desc")

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false)

  const searchInputRef = React.useRef<HTMLInputElement | null>(null)

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (isInput) return

      if (e.key === "c" || e.key === "n" || e.key === "C" || e.key === "N") {
        e.preventDefault()
        setEditingTask(null)
        setIsCreateOpen(true)
      } else if (e.key === "/") {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === "?") {
        e.preventDefault()
        setIsShortcutsOpen(true)
      }
    }

    const handleCreateEvent = () => {
      setEditingTask(null)
      setIsCreateOpen(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("myos:create-task", handleCreateEvent)

    // Handle deep-link or command palette query parameter
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (params.get("new") === "true" || params.get("create") === "true") {
          setEditingTask(null)
          setIsCreateOpen(true)
          window.history.replaceState({}, "", window.location.pathname)
        }
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("myos:create-task", handleCreateEvent)
    }
  }, [])

  // Optimistic Toggle Complete / Reopen
  const handleToggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    setErrorMessage(null)
    const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed"
    const nextCompletedAt = nextStatus === "completed" ? new Date().toISOString() : null

    // Optimistic state update
    const previousTasks = [...tasks]
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: nextStatus, completed_at: nextCompletedAt } : t
      )
    )

    setPendingTaskIds((prev) => new Set(prev).add(taskId))

    try {
      const res = await toggleTaskStatus(taskId, currentStatus)
      if (!res.success) {
        // Rollback
        setTasks(previousTasks)
        setErrorMessage(res.error || "Failed to toggle task status.")
      }
    } catch {
      setTasks(previousTasks)
      setErrorMessage("Network error occurred while toggling status.")
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Explicit Status Change (from dropdown)
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    setErrorMessage(null)
    const nextCompletedAt = newStatus === "completed" ? new Date().toISOString() : null

    const previousTasks = [...tasks]
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, completed_at: nextCompletedAt } : t
      )
    )

    setPendingTaskIds((prev) => new Set(prev).add(taskId))

    try {
      const res = await updateTaskStatus(taskId, newStatus)
      if (!res.success) {
        setTasks(previousTasks)
        setErrorMessage(res.error || "Failed to update task status.")
      }
    } catch {
      setTasks(previousTasks)
      setErrorMessage("Network error while updating status.")
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Optimistic Delete
  const handleDeleteTask = async (taskId: string) => {
    setErrorMessage(null)
    const previousTasks = [...tasks]
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setPendingTaskIds((prev) => new Set(prev).add(taskId))

    try {
      const res = await deleteTask(taskId)
      if (!res.success) {
        setTasks(previousTasks)
        setErrorMessage(res.error || "Failed to delete task.")
      }
    } catch {
      setTasks(previousTasks)
      setErrorMessage("Network error while deleting task.")
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // On Create / Edit Success
  const handleSaveSuccess = (savedTask: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id)
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t))
      }
      return [savedTask, ...prev]
    })
  }

  // Compute Task Counts
  const counts = React.useMemo(() => {
    return getTaskCounts(tasks, startISO, endISO)
  }, [tasks, startISO, endISO])

  // Filter and Sort Tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    const filtered = filterTasks(tasks, {
      statusFilter,
      priorityFilter,
      dueDateFilter,
      searchQuery,
      startISO,
      endISO,
    })

    return sortTasks(filtered, sortField, sortOrder)
  }, [
    tasks,
    statusFilter,
    priorityFilter,
    dueDateFilter,
    searchQuery,
    startISO,
    endISO,
    sortField,
    sortOrder,
  ])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <CheckSquare className="size-3.5" />
            <span>Task Manager</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tasks
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {counts.active} active · {counts.completed} completed
            {counts.overdue > 0 && (
              <span className="text-destructive font-semibold">
                {" "}· {counts.overdue} overdue
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Shortcuts hint button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShortcutsOpen(true)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground hidden sm:inline-flex cursor-pointer"
            title="Keyboard shortcuts"
          >
            <Keyboard className="size-3.5 mr-1" />
            <span>?</span>
          </Button>

          {/* Add Task Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null)
              setIsCreateOpen(true)
            }}
            className="gap-1.5 font-mono text-xs cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Add Task</span>
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-primary-foreground/20 text-[10px]">
              C
            </kbd>
          </Button>
        </div>
      </div>

      {/* Error banner if an action fails */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 p-3 text-xs rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-mono animate-in fade-in-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 2. Filters & Controls */}
      <TaskFiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        dueDateFilter={dueDateFilter}
        onDueDateFilterChange={setDueDateFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field)
          setSortOrder(order)
        }}
        counts={counts}
        searchInputRef={searchInputRef}
      />

      {/* 3. Task List */}
      <div className="flex flex-col gap-2 min-h-[200px]">
        {filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map((task) => (
            <TaskItemCard
              key={task.id}
              task={task}
              startISO={startISO}
              endISO={endISO}
              timeZone={timeZone}
              onToggleStatus={handleToggleStatus}
              onUpdateStatus={handleUpdateStatus}
              onEdit={(t) => {
                setEditingTask(t)
                setIsCreateOpen(true)
              }}
              onDelete={handleDeleteTask}
              isPending={pendingTaskIds.has(task.id)}
            />
          ))
        ) : tasks.length === 0 ? (
          /* Empty state: No tasks at all */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/50 gap-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                No tasks yet
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Get started by creating your first task. Track your to-dos, priorities, and deadlines in one place.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTask(null)
                setIsCreateOpen(true)
              }}
              className="gap-1.5 font-mono text-xs mt-2 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Create First Task</span>
            </Button>
          </div>
        ) : (
          /* Empty state: Filter returned 0 results */
          <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-border/50 bg-muted/20 gap-2.5">
            <h3 className="text-xs font-semibold text-foreground">
              No matching tasks found
            </h3>
            <p className="text-[11px] font-mono text-muted-foreground">
              Try adjusting your search query, status, priority, or due date filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setPriorityFilter("all")
                setDueDateFilter("all")
                setSearchQuery("")
              }}
              className="text-xs font-mono mt-1 cursor-pointer"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* 4. Footer keyboard hint */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 text-xs font-mono text-muted-foreground">
        <span>
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">C</kbd> to add task, <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">/</kbd> to search.
        </span>
        <button
          type="button"
          onClick={() => setIsShortcutsOpen(true)}
          className="hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          View all shortcuts (?)
        </button>
      </div>

      {/* Task Create / Edit Dialog */}
      <TaskFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) setEditingTask(null)
        }}
        taskToEdit={editingTask}
        timeZone={timeZone}
        onSuccess={handleSaveSuccess}
      />

      {/* Keyboard Shortcuts Dialog */}
      <TaskShortcutsDialog
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </div>
  )
}
