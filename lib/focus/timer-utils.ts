import type { PomodoroType } from "@/types/database"

export type PomodoroState =
  | "IDLE"
  | "FOCUSING"
  | "FOCUS_COMPLETE"
  | "SHORT_BREAK"
  | "BREAK_COMPLETE"

export const DEFAULT_DURATIONS: Record<PomodoroType, number> = {
  focus: 25 * 60, // 25 minutes = 1500 seconds
  short_break: 5 * 60, // 5 minutes = 300 seconds
  long_break: 15 * 60, // 15 minutes = 900 seconds
}

/**
 * Normalizes an input timestamp into unix milliseconds.
 */
function toTimestampMs(time: string | Date | number): number {
  if (typeof time === "number") return time
  if (time instanceof Date) return time.getTime()
  const parsed = Date.parse(time)
  return isNaN(parsed) ? Date.now() : parsed
}

/**
 * Calculates remaining seconds in a session strictly based on timestamps.
 * Immune to browser throttling, tab backgrounding, and system sleep.
 */
export function calculateRemainingSeconds(
  startedAt: string | Date | number,
  durationSeconds: number,
  now: number = Date.now()
): number {
  if (durationSeconds <= 0) return 0

  const startMs = toTimestampMs(startedAt)
  const durationMs = durationSeconds * 1000
  const targetEndMs = startMs + durationMs

  const remainingMs = targetEndMs - now
  if (remainingMs <= 0) {
    return 0
  }

  // Use Math.ceil so 1499.2 seconds displays as 1500 or 25:00
  return Math.min(durationSeconds, Math.ceil(remainingMs / 1000))
}

/**
 * Calculates elapsed seconds since started_at timestamp.
 */
export function calculateElapsedSeconds(
  startedAt: string | Date | number,
  now: number = Date.now()
): number {
  const startMs = toTimestampMs(startedAt)
  const elapsedMs = Math.max(0, now - startMs)
  return Math.floor(elapsedMs / 1000)
}

/**
 * Calculates session completion progress ratio (0 to 1).
 */
export function calculateProgress(
  startedAt: string | Date | number,
  durationSeconds: number,
  now: number = Date.now()
): number {
  if (durationSeconds <= 0) return 1

  const startMs = toTimestampMs(startedAt)
  const durationMs = durationSeconds * 1000
  const elapsedMs = Math.max(0, now - startMs)

  return Math.min(1, Math.max(0, elapsedMs / durationMs))
}

/**
 * Checks whether a session has reached its full duration based on timestamps.
 */
export function isSessionCompleted(
  startedAt: string | Date | number,
  durationSeconds: number,
  now: number = Date.now()
): boolean {
  if (durationSeconds <= 0) return true
  const startMs = toTimestampMs(startedAt)
  const targetEndMs = startMs + durationSeconds * 1000
  return now >= targetEndMs
}

/**
 * Formats seconds into MM:SS display format.
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60

  const padMinutes = String(minutes).padStart(2, "0")
  const padSeconds = String(seconds).padStart(2, "0")

  return `${padMinutes}:${padSeconds}`
}

/**
 * Determines current Pomodoro state based on active session properties and current time.
 */
export function derivePomodoroState(
  session: {
    type: PomodoroType
    started_at: string
    duration_seconds: number
    ended_at: string | null
  } | null,
  now: number = Date.now()
): {
  state: PomodoroState
  remainingSeconds: number
  progress: number
  isCompleted: boolean
} {
  if (!session || session.ended_at !== null) {
    return {
      state: "IDLE",
      remainingSeconds: DEFAULT_DURATIONS.focus,
      progress: 0,
      isCompleted: false,
    }
  }

  const remainingSeconds = calculateRemainingSeconds(
    session.started_at,
    session.duration_seconds,
    now
  )
  const progress = calculateProgress(
    session.started_at,
    session.duration_seconds,
    now
  )
  const isCompleted = isSessionCompleted(
    session.started_at,
    session.duration_seconds,
    now
  )

  if (session.type === "focus") {
    return {
      state: isCompleted ? "FOCUS_COMPLETE" : "FOCUSING",
      remainingSeconds,
      progress,
      isCompleted,
    }
  }

  // Short break or long break
  return {
    state: isCompleted ? "BREAK_COMPLETE" : "SHORT_BREAK",
    remainingSeconds,
    progress,
    isCompleted,
  }
}
