import type { SearchTaskResult, SearchNoteResult, SearchEventResult } from "./types"
import { formatNoteUpdatedTime } from "@/lib/notes/utils"
import { DEFAULT_TIMEZONE, resolveTimeZone } from "@/lib/calendar/timezone-utils"

/**
 * Strips Markdown formatting elements and returns a clean, compact text snippet.
 */
export function cleanMarkdownSnippet(markdown: string, maxLength = 80): string {
  if (!markdown) return ""

  const clean = markdown
    // Code blocks
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    // Headers
    .replace(/#{1,6}\s+/g, "")
    // Images and links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Emphasis (bold, italic)
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Blockquotes & list markers
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Whitespace collapse
    .replace(/\s+/g, " ")
    .trim()

  if (clean.length <= maxLength) {
    return clean
  }

  return clean.slice(0, maxLength).trimEnd() + "…"
}

/**
 * Formats task due date for search results display.
 */
export function formatSearchDueDate(
  dueAt: string | null,
  timeZone = DEFAULT_TIMEZONE
): { label: string; isOverdue: boolean } | null {
  if (!dueAt) return null
  const now = new Date()
  const due = new Date(dueAt)
  if (isNaN(due.getTime())) return null

  const isOverdue = due.getTime() < now.getTime()
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    month: "short",
    day: "numeric",
  }).format(due)

  return {
    label: isOverdue ? `Overdue · ${dateStr}` : `Due ${dateStr}`,
    isOverdue,
  }
}

/**
 * Human-readable task metadata labels.
 */
export function getTaskMetadata(task: SearchTaskResult, timeZone = DEFAULT_TIMEZONE) {
  const statusLabels: Record<SearchTaskResult["status"], string> = {
    todo: "To Do",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }

  const priorityLabels: Record<SearchTaskResult["priority"], string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  }

  const dueInfo = formatSearchDueDate(task.due_at, timeZone)

  return {
    statusLabel: statusLabels[task.status] || task.status,
    priorityLabel: priorityLabels[task.priority] || task.priority,
    dueLabel: dueInfo?.label || null,
    isOverdue: dueInfo?.isOverdue ?? false,
    descriptionSnippet: task.description ? cleanMarkdownSnippet(task.description, 60) : null,
  }
}

/**
 * Note metadata summary.
 */
export function getNoteMetadata(note: SearchNoteResult) {
  if (note.is_locked) {
    return {
      contentSnippet: "Locked note",
      updatedLabel: formatNoteUpdatedTime(note.updated_at),
    }
  }

  return {
    contentSnippet: cleanMarkdownSnippet(note.content, 75),
    updatedLabel: formatNoteUpdatedTime(note.updated_at),
  }
}

/**
 * Calendar event human-readable date/time range.
 */
export function getEventMetadata(
  event: SearchEventResult,
  timeZone: string = DEFAULT_TIMEZONE
) {
  const safeTz = resolveTimeZone(timeZone)
  const startDate = new Date(event.start_at)

  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    month: "short",
    day: "numeric",
  }).format(startDate)

  if (event.all_day) {
    return {
      timeLabel: `All day · ${dateStr}`,
      descriptionSnippet: event.description ? cleanMarkdownSnippet(event.description, 60) : null,
    }
  }

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const startFormatted = timeFormatter.format(startDate)
  let timeLabel = `${dateStr}, ${startFormatted}`

  if (event.end_at) {
    const endFormatted = timeFormatter.format(new Date(event.end_at))
    timeLabel = `${dateStr}, ${startFormatted} – ${endFormatted}`
  }

  return {
    timeLabel,
    descriptionSnippet: event.description ? cleanMarkdownSnippet(event.description, 60) : null,
  }
}
