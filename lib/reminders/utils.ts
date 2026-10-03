import type { Reminder } from "@/types/database"
import type { ReminderFilter, ReminderWithMeta } from "./types"
import { resolveTimeZone, DEFAULT_TIMEZONE, utcToLocalDateParts } from "@/lib/calendar/timezone-utils"

/**
 * Determines if an uncompleted reminder is past its scheduled time.
 */
export function isReminderPastDue(
  remindAtUtc: string,
  completed: boolean,
  now = new Date()
): boolean {
  if (completed) {
    return false
  }
  return new Date(remindAtUtc).getTime() < now.getTime()
}

/**
 * Formats a reminder's UTC timestamp into a human-friendly string in the user's timezone.
 */
export function formatReminderTimestamp(
  remindAtUtc: string,
  timeZone = DEFAULT_TIMEZONE,
  now = new Date()
): string {
  const safeTz = resolveTimeZone(timeZone)
  const scheduledDate = new Date(remindAtUtc)

  const scheduledParts = utcToLocalDateParts(remindAtUtc, safeTz)
  const nowParts = utcToLocalDateParts(now.toISOString(), safeTz)

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const timeStr = timeFormatter.format(scheduledDate)

  // Compare dates in user's timezone
  if (scheduledParts.date === nowParts.date) {
    return `Today at ${timeStr}`
  }

  // Check tomorrow / yesterday in local calendar days
  const scheduledEpochDay = Math.floor(
    new Date(`${scheduledParts.date}T00:00:00Z`).getTime() / (24 * 60 * 60 * 1000)
  )
  const nowEpochDay = Math.floor(
    new Date(`${nowParts.date}T00:00:00Z`).getTime() / (24 * 60 * 60 * 1000)
  )

  if (scheduledEpochDay === nowEpochDay + 1) {
    return `Tomorrow at ${timeStr}`
  }
  if (scheduledEpochDay === nowEpochDay - 1) {
    return `Yesterday at ${timeStr}`
  }

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return `${dateFormatter.format(scheduledDate)} at ${timeStr}`
}

/**
 * Computes a relative badge label indicating how soon or overdue a reminder is.
 */
export function getReminderRelativeLabel(
  remindAtUtc: string,
  completed: boolean,
  timeZone = DEFAULT_TIMEZONE,
  now = new Date()
): { label: string; isPastDue: boolean } {
  if (completed) {
    return { label: "Completed", isPastDue: false }
  }

  const safeTz = resolveTimeZone(timeZone)
  const scheduledMs = new Date(remindAtUtc).getTime()
  const nowMs = now.getTime()
  const diffMs = scheduledMs - nowMs

  if (diffMs < 0) {
    // Past due
    const elapsedMinutes = Math.floor(Math.abs(diffMs) / (60 * 1000))
    if (elapsedMinutes < 1) {
      return { label: "Past due just now", isPastDue: true }
    }
    if (elapsedMinutes < 60) {
      return { label: `Past due · ${elapsedMinutes}m ago`, isPastDue: true }
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60)
    if (elapsedHours < 24) {
      return { label: `Past due · ${elapsedHours}h ago`, isPastDue: true }
    }

    const elapsedDays = Math.floor(elapsedHours / 24)
    return { label: `Past due · ${elapsedDays}d ago`, isPastDue: true }
  }

  // Upcoming
  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  if (diffMinutes < 1) {
    return { label: "Due in less than 1m", isPastDue: false }
  }
  if (diffMinutes < 60) {
    return { label: `In ${diffMinutes}m`, isPastDue: false }
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return { label: `In ${diffHours}h`, isPastDue: false }
  }

  return {
    label: formatReminderTimestamp(remindAtUtc, safeTz, now),
    isPastDue: false,
  }
}

/**
 * Enriches a raw database reminder with formatted timezone strings and past-due flags.
 */
export function enrichReminder(
  reminder: Reminder,
  timeZone = DEFAULT_TIMEZONE,
  now = new Date()
): ReminderWithMeta {
  const isPastDue = isReminderPastDue(reminder.remind_at, reminder.completed, now)
  const formattedScheduledAt = formatReminderTimestamp(reminder.remind_at, timeZone, now)
  const { label: relativeLabel } = getReminderRelativeLabel(
    reminder.remind_at,
    reminder.completed,
    timeZone,
    now
  )

  return {
    ...reminder,
    isPastDue,
    formattedScheduledAt,
    relativeLabel,
  }
}

/**
 * Filters a list of reminders according to the selected view filter.
 */
export function filterReminders<T extends Reminder>(
  reminders: T[],
  filter: ReminderFilter,
  now = new Date()
): T[] {
  switch (filter) {
    case "upcoming":
      return reminders.filter(
        (r) => !r.completed && new Date(r.remind_at).getTime() >= now.getTime()
      )
    case "past_due":
      return reminders.filter(
        (r) => !r.completed && new Date(r.remind_at).getTime() < now.getTime()
      )
    case "completed":
      return reminders.filter((r) => r.completed)
    case "all":
    default:
      return reminders
  }
}

/**
 * Derives statistical counts for all reminder filter tabs.
 */
export function deriveReminderCounts(
  reminders: Reminder[],
  now = new Date()
): {
  total: number
  upcoming: number
  pastDue: number
  completed: number
} {
  let upcoming = 0
  let pastDue = 0
  let completed = 0

  for (const r of reminders) {
    if (r.completed) {
      completed++
    } else if (new Date(r.remind_at).getTime() < now.getTime()) {
      pastDue++
    } else {
      upcoming++
    }
  }

  return {
    total: reminders.length,
    upcoming,
    pastDue,
    completed,
  }
}
