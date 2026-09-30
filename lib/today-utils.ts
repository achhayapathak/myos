import type { PomodoroSession } from "@/types/database"

export interface TodayDateBounds {
  dateStr: string
  formattedDate: string
  greeting: string
  startISO: string
  endISO: string
  timeZone: string
}

export interface FocusSummary {
  activeSession: (PomodoroSession & { task_title?: string | null }) | null
  completedSessionsToday: number
  totalFocusMinutesToday: number
}

/**
 * Calculates accurate UTC start/end timestamps and local formatting for a target timezone.
 * Pure function: safe for both client and server components.
 */
export function getTodayDateBounds(timeZone = "Asia/Kolkata"): TodayDateBounds {
  const now = new Date()

  // Extract year, month, day, hour in the target timezone
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now)
  } catch {
    // Fallback if invalid timezone passed
    timeZone = "UTC"
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now)
  }

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || ""
  const year = getPart("year")
  const month = getPart("month")
  const day = getPart("day")
  const hour = parseInt(getPart("hour") || "12", 10)

  const dateStr = `${year}-${month}-${day}`

  // Timezone greeting
  let greeting = "Good day"
  if (hour >= 4 && hour < 12) {
    greeting = "Good morning"
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon"
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening"
  } else {
    greeting = "Good night"
  }

  // Human readable date (e.g., Wednesday, September 30, 2026)
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now)

  // Calculate midnight in the target timezone converted to UTC
  const referenceMidnightUtc = new Date(`${dateStr}T00:00:00.000Z`)

  // Timezone offset in minutes for midnight
  const utcDate = new Date(referenceMidnightUtc.toLocaleString("en-US", { timeZone: "UTC" }))
  const tzDate = new Date(referenceMidnightUtc.toLocaleString("en-US", { timeZone }))
  const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000)

  const startUtc = new Date(referenceMidnightUtc.getTime() - offsetMinutes * 60000)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1)

  return {
    dateStr,
    formattedDate,
    greeting,
    startISO: startUtc.toISOString(),
    endISO: endUtc.toISOString(),
    timeZone,
  }
}

/**
 * Formats an event's start and end times for clean display.
 * Pure function: safe for both client and server components.
 */
export function formatEventTime(
  startAt: string,
  endAt: string | null,
  allDay: boolean,
  timeZone = "Asia/Kolkata"
): string {
  if (allDay) {
    return "All Day"
  }

  const startDate = new Date(startAt)
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const formattedStart = timeFormatter.format(startDate)

  if (!endAt) {
    return formattedStart
  }

  const endDate = new Date(endAt)
  const formattedEnd = timeFormatter.format(endDate)

  return `${formattedStart} – ${formattedEnd}`
}

/**
 * Returns a friendly relative label for a task's due date.
 * Pure function: safe for both client and server components.
 */
export function getTaskDueLabel(
  dueAt: string | null,
  startISO: string,
  endISO: string,
  timeZone = "Asia/Kolkata"
): { label: string; isOverdue: boolean } {
  if (!dueAt) {
    return { label: "", isOverdue: false }
  }

  const due = new Date(dueAt).getTime()
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()

  if (due < start) {
    return { label: "Overdue", isOverdue: true }
  }

  if (due >= start && due <= end) {
    // Format due time if not midnight
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
      return { label: `Today, ${timeStr}`, isOverdue: false }
    }

    return { label: "Today", isOverdue: false }
  }

  // Future date
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(dueAt))

  return { label: dateStr, isOverdue: false }
}
