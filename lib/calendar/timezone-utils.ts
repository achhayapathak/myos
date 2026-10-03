import type { Event as DbEvent } from "@/types/database"
import type { CalendarEventDTO } from "./types"

export const DEFAULT_TIMEZONE = "Asia/Kolkata"

/**
 * Validates whether a timezone identifier is supported by the JavaScript runtime.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * Resolves a valid timezone, falling back to DEFAULT_TIMEZONE ("Asia/Kolkata") if invalid or empty.
 */
export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone || !isValidTimeZone(timeZone)) {
    return DEFAULT_TIMEZONE
  }
  return timeZone
}

/**
 * Converts a local date ("YYYY-MM-DD") and time ("HH:mm" or "HH:mm:ss") in a given
 * timezone into an exact UTC ISO 8601 string for PostgreSQL storage.
 */
export function localToUtc(
  dateStr: string,
  timeStr = "00:00",
  timeZone = DEFAULT_TIMEZONE
): string {
  const safeTz = resolveTimeZone(timeZone)
  const [yearStr, monthStr, dayStr] = dateStr.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  const timeParts = (timeStr || "00:00").split(":")
  const hour = Number(timeParts[0] || 0)
  const minute = Number(timeParts[1] || 0)
  const second = Number(timeParts[2] || 0)

  // Construct a UTC reference point
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

  // Determine timezone representation of this UTC reference
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(utcGuess)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || ""

  const tzYear = Number(getPart("year"))
  const tzMonth = Number(getPart("month"))
  const tzDay = Number(getPart("day"))
  let tzHour = Number(getPart("hour"))
  if (tzHour === 24) tzHour = 0
  const tzMin = Number(getPart("minute"))
  const tzSec = Number(getPart("second"))

  const tzDateAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec)
  const offsetMs = tzDateAsUtc - utcGuess.getTime()

  return new Date(utcGuess.getTime() - offsetMs).toISOString()
}

/**
 * Converts a UTC timestamp into local date and time parts in the user's timezone.
 */
export function utcToLocalDateParts(
  utcIso: string,
  timeZone = DEFAULT_TIMEZONE
): {
  date: string
  time: string
  dateTimeLocal: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const safeTz = resolveTimeZone(timeZone)
  const d = new Date(utcIso)

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(d)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || ""

  const year = Number(getPart("year"))
  const month = Number(getPart("month"))
  const day = Number(getPart("day"))
  let hour = Number(getPart("hour"))
  if (hour === 24) hour = 0
  const minute = Number(getPart("minute"))

  const pad = (n: number) => String(n).padStart(2, "0")
  const date = `${year}-${pad(month)}-${pad(day)}`
  const time = `${pad(hour)}:${pad(minute)}`
  const dateTimeLocal = `${date}T${time}`

  return {
    date,
    time,
    dateTimeLocal,
    year,
    month,
    day,
    hour,
    minute,
  }
}

/**
 * Calculates start and end UTC timestamps for an all-day event in the user's timezone.
 * Start is midnight (00:00:00.000) of startDate in the user's timezone.
 * End is 23:59:59.999 of endDate in the user's timezone.
 */
export function computeAllDayUtcRange(
  startDateStr: string,
  endDateStr?: string | null,
  timeZone = DEFAULT_TIMEZONE
): { start_at: string; end_at: string } {
  const safeTz = resolveTimeZone(timeZone)
  const finalEndDateStr = endDateStr || startDateStr

  const startUtc = localToUtc(startDateStr, "00:00:00", safeTz)
  // Ensure we compute 23:59:59 in the local timezone
  const endBase = localToUtc(finalEndDateStr, "23:59:59", safeTz)
  const endWithMs = new Date(new Date(endBase).getTime() + 999).toISOString()

  return {
    start_at: startUtc,
    end_at: endWithMs,
  }
}

/**
 * Computes the day after a given date string ("YYYY-MM-DD").
 */
export function addDaysToDateStr(dateStr: string, days = 1): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Formats a database Event into FullCalendar's required event format.
 */
export function toFullCalendarEvent(
  event: DbEvent,
  timeZone = DEFAULT_TIMEZONE
): CalendarEventDTO {
  const safeTz = resolveTimeZone(timeZone)

  if (event.all_day) {
    const localStart = utcToLocalDateParts(event.start_at, safeTz).date
    let localEnd: string | undefined

    if (event.end_at) {
      const endParts = utcToLocalDateParts(event.end_at, safeTz)
      // FullCalendar expects the all-day end date to be exclusive (next day)
      localEnd = addDaysToDateStr(endParts.date, 1)
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      allDay: true,
      start: localStart,
      end: localEnd,
      start_at: event.start_at,
      end_at: event.end_at,
    }
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    allDay: false,
    start: event.start_at,
    end: event.end_at || undefined,
    start_at: event.start_at,
    end_at: event.end_at,
  }
}

/**
 * Human-readable time formatting for an event in the user's timezone.
 */
export function formatEventTimeRange(
  startUtc: string,
  endUtc: string | null,
  allDay: boolean,
  timeZone = DEFAULT_TIMEZONE
): string {
  if (allDay) {
    return "All Day"
  }

  const safeTz = resolveTimeZone(timeZone)
  const startDate = new Date(startUtc)

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const formattedStart = timeFormatter.format(startDate)

  if (!endUtc) {
    return formattedStart
  }

  const endDate = new Date(endUtc)
  const formattedEnd = timeFormatter.format(endDate)

  return `${formattedStart} – ${formattedEnd}`
}

/**
 * Human-readable full date formatting (e.g., "Saturday, Oct 3, 2026") in the user's timezone.
 */
export function formatEventDate(
  utcIso: string,
  timeZone = DEFAULT_TIMEZONE
): string {
  const safeTz = resolveTimeZone(timeZone)
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(utcIso))
}
