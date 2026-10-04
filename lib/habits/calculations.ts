import { DEFAULT_TIMEZONE, resolveTimeZone } from "@/lib/calendar/timezone-utils"

export interface HabitScheduleRule {
  frequency_type: "daily" | "weekly"
  target_days?: number[] | null
  created_at?: string | null
}

const ISO_DAY_NAMES: Record<number, { short: string; full: string }> = {
  1: { short: "Mon", full: "Monday" },
  2: { short: "Tue", full: "Tuesday" },
  3: { short: "Wed", full: "Wednesday" },
  4: { short: "Thu", full: "Thursday" },
  5: { short: "Fri", full: "Friday" },
  6: { short: "Sat", full: "Saturday" },
  7: { short: "Sun", full: "Sunday" },
}

/**
 * Returns the ISO weekday number for a given YYYY-MM-DD date string.
 * 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday.
 */
export function getISOWeekday(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = dt.getUTCDay()
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

/**
 * Adds (or subtracts) a number of days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day))
  dt.setUTCDate(dt.getUTCDate() + days)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d = String(dt.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Returns a list of date strings between startDateStr and endDateStr (inclusive).
 */
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  if (startDateStr > endDateStr) {
    return []
  }

  const dates: string[] = []
  let curr = startDateStr
  while (curr <= endDateStr) {
    dates.push(curr)
    curr = addDays(curr, 1)
  }
  return dates
}

/**
 * Converts a Date object or current time to YYYY-MM-DD in the user's timezone.
 */
export function getLocalDateString(
  date: Date = new Date(),
  timeZone = DEFAULT_TIMEZONE
): string {
  const safeTz = resolveTimeZone(timeZone)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

/**
 * Checks whether a habit is scheduled for a specific calendar date (YYYY-MM-DD).
 */
export function isHabitScheduledForDate(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">,
  dateStr: string
): boolean {
  if (habit.frequency_type === "daily") {
    return true
  }

  if (habit.frequency_type === "weekly") {
    if (!habit.target_days || habit.target_days.length === 0) {
      return false
    }
    const isoDay = getISOWeekday(dateStr)
    return habit.target_days.includes(isoDay)
  }

  return false
}

/**
 * Returns all dates in [startDateStr, endDateStr] on which the habit is scheduled.
 */
export function getScheduledDates(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">,
  startDateStr: string,
  endDateStr: string
): string[] {
  if (startDateStr > endDateStr) {
    return []
  }

  const allDates = getDatesInRange(startDateStr, endDateStr)
  return allDates.filter((d) => isHabitScheduledForDate(habit, d))
}

/**
 * Finds the previous scheduled date strictly before dateStr for a habit.
 * Looks backward up to 14 days (or returns null if none found).
 */
export function getPreviousScheduledDate(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">,
  dateStr: string,
  lookbackLimit = 14
): string | null {
  let curr = addDays(dateStr, -1)
  for (let i = 0; i < lookbackLimit; i++) {
    if (isHabitScheduledForDate(habit, curr)) {
      return curr
    }
    curr = addDays(curr, -1)
  }
  return null
}

/**
 * Calculates current streak for a habit relative to todayDateStr.
 *
 * Rules:
 * - For daily habits: consecutive scheduled days completed up to today.
 * - For weekly habits: only target days count toward streak. Unscheduled days never break the streak.
 * - If today is scheduled and completed: streak starts at 1 (today) and counts consecutive past scheduled completions.
 * - If today is scheduled but not completed yet: today is in-progress and does not break streak;
 *   evaluates the streak starting from the most recent prior scheduled day.
 * - If today is not scheduled: evaluates the streak starting from the most recent prior scheduled day.
 */
export function calculateCurrentStreak(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">,
  completedDatesInput: string[] | Set<string>,
  todayDateStr: string
): number {
  const completedSet =
    completedDatesInput instanceof Set
      ? completedDatesInput
      : new Set(completedDatesInput)

  const isTodayScheduled = isHabitScheduledForDate(habit, todayDateStr)
  const isTodayCompleted = completedSet.has(todayDateStr)

  let streak = 0
  let checkDate: string | null = null

  if (isTodayScheduled && isTodayCompleted) {
    // Today is completed: start streak at 1 and check previous scheduled days
    streak = 1
    checkDate = getPreviousScheduledDate(habit, todayDateStr)
  } else {
    // Today is either not scheduled, or scheduled but not yet completed.
    // In both cases, check the most recent prior scheduled date.
    checkDate = getPreviousScheduledDate(habit, todayDateStr)
  }

  // Walk backward through scheduled days
  while (checkDate !== null) {
    if (completedSet.has(checkDate)) {
      streak++
      checkDate = getPreviousScheduledDate(habit, checkDate)
    } else {
      break
    }
  }

  return streak
}

/**
 * Calculates longest streak of consecutive scheduled completions across history.
 *
 * Scans all scheduled days from the earliest completion date up to endDateStr (or today).
 */
export function calculateLongestStreak(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">,
  completedDatesInput: string[] | Set<string>,
  options: { endDateStr?: string; startDateStr?: string } = {}
): number {
  const completedArr =
    completedDatesInput instanceof Set
      ? Array.from(completedDatesInput)
      : [...completedDatesInput]

  if (completedArr.length === 0) {
    return 0
  }

  const sortedCompleted = completedArr.sort()
  const firstCompleted = sortedCompleted[0]
  const lastCompleted = sortedCompleted[sortedCompleted.length - 1]

  const start = options.startDateStr
    ? options.startDateStr
    : firstCompleted

  const end = options.endDateStr
    ? options.endDateStr
    : lastCompleted

  if (start > end) {
    return 0
  }

  const scheduledDates = getScheduledDates(habit, start, end)
  const completedSet = new Set(completedArr)

  let longest = 0
  let currentRun = 0

  for (const date of scheduledDates) {
    if (completedSet.has(date)) {
      currentRun++
      if (currentRun > longest) {
        longest = currentRun
      }
    } else {
      currentRun = 0
    }
  }

  return longest
}

/**
 * Calculates completion rate percentage over a bounded date range.
 *
 * completion rate = (completed scheduled occurrences / total scheduled occurrences) * 100
 *
 * Does not count unscheduled days as failures.
 * Optionally respects habit created_at date so days before creation are not counted as failures.
 */
export function calculateCompletionRate(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days" | "created_at">,
  completedDatesInput: string[] | Set<string>,
  startDateStr: string,
  endDateStr: string
): number {
  if (startDateStr > endDateStr) {
    return 0
  }

  const scheduled = getScheduledDates(habit, startDateStr, endDateStr)
  if (scheduled.length === 0) {
    return 0
  }

  let eligibleDates = scheduled

  // If habit has a created_at date, do not penalize days before it was created
  if (habit.created_at) {
    const createdDateStr = habit.created_at.slice(0, 10)
    eligibleDates = scheduled.filter((d) => d >= createdDateStr)
    if (eligibleDates.length === 0) {
      return 0
    }
  }

  const completedSet =
    completedDatesInput instanceof Set
      ? completedDatesInput
      : new Set(completedDatesInput)

  const completedScheduledCount = eligibleDates.filter((d) =>
    completedSet.has(d)
  ).length

  const percentage = (completedScheduledCount / eligibleDates.length) * 100
  return Math.round(percentage * 10) / 10
}

/**
 * Returns a human-friendly schedule description, e.g.:
 * - "Daily"
 * - "Weekdays"
 * - "Weekends"
 * - "Mon, Wed, Fri"
 */
export function getHabitScheduleDescription(
  habit: Pick<HabitScheduleRule, "frequency_type" | "target_days">
): string {
  if (habit.frequency_type === "daily") {
    return "Daily"
  }

  const days = habit.target_days ? [...habit.target_days].sort((a, b) => a - b) : []
  if (days.length === 0) {
    return "Weekly (no days set)"
  }

  if (days.length === 7) {
    return "Every day"
  }

  const daysStr = days.join(",")
  if (daysStr === "1,2,3,4,5") {
    return "Weekdays"
  }

  if (daysStr === "6,7") {
    return "Weekends"
  }

  return days.map((d) => ISO_DAY_NAMES[d]?.short || String(d)).join(", ")
}

/**
 * Human-readable date formatting for habit header and details, e.g. "Monday, October 5".
 */
export function formatHabitDate(
  dateStr: string,
  timeZone = DEFAULT_TIMEZONE
): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const safeTz = resolveTimeZone(timeZone)

  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(dt)
}

/**
 * Formats a short date for calendar / heatmap labels, e.g. "Oct 5".
 */
export function formatHabitShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(dt)
}
