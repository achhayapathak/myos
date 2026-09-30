import type { Task, TaskPriority, TaskStatus } from "@/types/database"

export type TaskStatusFilter =
  | "all"
  | "active"
  | "todo"
  | "in_progress"
  | "completed"
  | "cancelled"

export type TaskPriorityFilter = "all" | "low" | "medium" | "high"

export type TaskDueDateFilter =
  | "all"
  | "overdue"
  | "today"
  | "upcoming"
  | "no_due_date"

export type TaskSortField = "due_at" | "priority" | "created_at" | "title"
export type TaskSortOrder = "asc" | "desc"

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; weight: number; colorClass: string; badgeVariant: "destructive" | "secondary" | "outline" }
> = {
  high: {
    label: "High",
    weight: 3,
    colorClass: "text-red-500 dark:text-red-400",
    badgeVariant: "destructive",
  },
  medium: {
    label: "Medium",
    weight: 2,
    colorClass: "text-amber-500 dark:text-amber-400",
    badgeVariant: "secondary",
  },
  low: {
    label: "Low",
    weight: 1,
    colorClass: "text-blue-500 dark:text-blue-400",
    badgeVariant: "outline",
  },
}

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; description: string }
> = {
  todo: {
    label: "To Do",
    description: "Task is pending execution",
  },
  in_progress: {
    label: "In Progress",
    description: "Actively being worked on",
  },
  completed: {
    label: "Completed",
    description: "Work finished",
  },
  cancelled: {
    label: "Cancelled",
    description: "Work discarded or no longer needed",
  },
}

export interface TaskCounts {
  all: number
  active: number
  todo: number
  in_progress: number
  completed: number
  cancelled: number
  dueToday: number
  overdue: number
}

/**
 * Calculates category counts across a collection of tasks.
 */
export function getTaskCounts(
  tasks: Task[],
  startISO: string,
  endISO: string
): TaskCounts {
  const counts: TaskCounts = {
    all: tasks.length,
    active: 0,
    todo: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    dueToday: 0,
    overdue: 0,
  }

  const startTime = new Date(startISO).getTime()
  const endTime = new Date(endISO).getTime()

  for (const task of tasks) {
    if (task.status === "todo") counts.todo++
    if (task.status === "in_progress") counts.in_progress++
    if (task.status === "completed") counts.completed++
    if (task.status === "cancelled") counts.cancelled++

    if (task.status === "todo" || task.status === "in_progress") {
      counts.active++

      if (task.due_at) {
        const dueTime = new Date(task.due_at).getTime()
        if (dueTime < startTime) {
          counts.overdue++
        } else if (dueTime >= startTime && dueTime <= endTime) {
          counts.dueToday++
        }
      }
    }
  }

  return counts
}

export interface FormatDueDateResult {
  label: string
  isOverdue: boolean
  isToday: boolean
}

/**
 * Formats a due date for display and computes overdue/today status.
 */
export function formatDueDate(
  dueAt: string | null,
  startISO: string,
  endISO: string,
  timeZone = "Asia/Kolkata"
): FormatDueDateResult {
  if (!dueAt) {
    return { label: "", isOverdue: false, isToday: false }
  }

  const due = new Date(dueAt).getTime()
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()

  if (due < start) {
    return { label: "Overdue", isOverdue: true, isToday: false }
  }

  if (due >= start && due <= end) {
    const dueDate = new Date(dueAt)
    const hours = dueDate.getUTCHours()
    const minutes = dueDate.getUTCMinutes()

    if (hours !== 0 || minutes !== 0) {
      const timeStr = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(dueDate)
      return { label: `Today, ${timeStr}`, isOverdue: false, isToday: true }
    }

    return { label: "Today", isOverdue: false, isToday: true }
  }

  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(dueAt))

  return { label: dateStr, isOverdue: false, isToday: false }
}

export interface FilterOptions {
  statusFilter: TaskStatusFilter
  priorityFilter: TaskPriorityFilter
  dueDateFilter: TaskDueDateFilter
  searchQuery: string
  startISO: string
  endISO: string
}

/**
 * Filters tasks according to status, priority, due date range, and search keyword.
 */
export function filterTasks(tasks: Task[], options: FilterOptions): Task[] {
  const {
    statusFilter,
    priorityFilter,
    dueDateFilter,
    searchQuery,
    startISO,
    endISO,
  } = options

  const trimmedQuery = searchQuery.trim().toLowerCase()
  const startTime = new Date(startISO).getTime()
  const endTime = new Date(endISO).getTime()

  return tasks.filter((task) => {
    // 1. Status Filter
    if (statusFilter === "active") {
      if (task.status !== "todo" && task.status !== "in_progress") {
        return false
      }
    } else if (statusFilter !== "all") {
      if (task.status !== statusFilter) {
        return false
      }
    }

    // 2. Priority Filter
    if (priorityFilter !== "all") {
      if (task.priority !== priorityFilter) {
        return false
      }
    }

    // 3. Due Date Filter
    if (dueDateFilter === "overdue") {
      if (!task.due_at || task.status === "completed" || task.status === "cancelled") {
        return false
      }
      if (new Date(task.due_at).getTime() >= startTime) {
        return false
      }
    } else if (dueDateFilter === "today") {
      if (!task.due_at) return false
      const dueTime = new Date(task.due_at).getTime()
      if (dueTime < startTime || dueTime > endTime) {
        return false
      }
    } else if (dueDateFilter === "upcoming") {
      if (!task.due_at) return false
      const dueTime = new Date(task.due_at).getTime()
      if (dueTime <= endTime) {
        return false
      }
    } else if (dueDateFilter === "no_due_date") {
      if (task.due_at !== null) return false
    }

    // 4. Search Query
    if (trimmedQuery) {
      const titleMatch = task.title.toLowerCase().includes(trimmedQuery)
      const descMatch = (task.description || "").toLowerCase().includes(trimmedQuery)
      if (!titleMatch && !descMatch) {
        return false
      }
    }

    return true
  })
}

/**
 * Sorts tasks by due date, priority, creation date, or title.
 */
export function sortTasks(
  tasks: Task[],
  sortField: TaskSortField,
  sortOrder: TaskSortOrder
): Task[] {
  return [...tasks].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case "priority": {
        const weightA = PRIORITY_CONFIG[a.priority]?.weight ?? 0
        const weightB = PRIORITY_CONFIG[b.priority]?.weight ?? 0
        comparison = weightA - weightB
        break
      }
      case "due_at": {
        if (!a.due_at && !b.due_at) comparison = 0
        else if (!a.due_at) comparison = 1 // Nulls at end
        else if (!b.due_at) comparison = -1
        else {
          comparison = new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
        }
        break
      }
      case "title": {
        comparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        break
      }
      case "created_at":
      default: {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      }
    }

    return sortOrder === "asc" ? comparison : -comparison
  })
}
