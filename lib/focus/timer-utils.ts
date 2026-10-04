import type { PomodoroType } from "@/types/database"

export type PomodoroState =
  | "IDLE"
  | "FOCUSING"
  | "FOCUS_COMPLETE"
  | "SHORT_BREAK"
  | "BREAK_COMPLETE"
  | "PAUSED"

export type PomodoroMode =
  | "short_focus"
  | "long_focus"
  | "short_break"
  | "long_break"

export const DEFAULT_DURATIONS: Record<PomodoroType, number> = {
  focus: 25 * 60, // 25 minutes = 1500 seconds
  short_break: 5 * 60, // 5 minutes = 300 seconds
  long_break: 15 * 60, // 15 minutes = 900 seconds
}

export const MODE_DURATIONS: Record<PomodoroMode, number> = {
  short_focus: 25 * 60, // 25 minutes = 1500 seconds
  long_focus: 50 * 60, // 50 minutes = 3000 seconds
  short_break: 5 * 60, // 5 minutes = 300 seconds
  long_break: 15 * 60, // 15 minutes = 900 seconds
}

export interface PomodoroModeConfig {
  mode: PomodoroMode
  type: PomodoroType
  label: string
  durationMinutes: number
  durationSeconds: number
  badgeLabel: string
  description: string
}

export const POMODORO_MODES: Record<PomodoroMode, PomodoroModeConfig> = {
  short_focus: {
    mode: "short_focus",
    type: "focus",
    label: "Short Focus",
    durationMinutes: 25,
    durationSeconds: 25 * 60,
    badgeLabel: "Short Focus",
    description: "25 minutes of deep focus",
  },
  long_focus: {
    mode: "long_focus",
    type: "focus",
    label: "Long Focus",
    durationMinutes: 50,
    durationSeconds: 50 * 60,
    badgeLabel: "Long Focus",
    description: "50 minutes of deep focus",
  },
  short_break: {
    mode: "short_break",
    type: "short_break",
    label: "Short Break",
    durationMinutes: 5,
    durationSeconds: 5 * 60,
    badgeLabel: "Short Break",
    description: "5 minutes to relax & breathe",
  },
  long_break: {
    mode: "long_break",
    type: "long_break",
    label: "Long Break",
    durationMinutes: 15,
    durationSeconds: 15 * 60,
    badgeLabel: "Long Break",
    description: "15 minutes to rest & recover",
  },
}

/**
 * Derives the semantic PomodoroMode from database type and duration.
 */
export function derivePomodoroMode(
  type: PomodoroType,
  durationSeconds?: number
): PomodoroMode {
  if (type === "short_break") return "short_break"
  if (type === "long_break") return "long_break"
  if (durationSeconds && durationSeconds >= 45 * 60) {
    return "long_focus"
  }
  return "short_focus"
}

/**
 * Returns a user-friendly label for a completed or active session.
 */
export function formatSessionLabel(
  type: PomodoroType,
  durationSeconds?: number
): string {
  if (type === "focus") {
    return durationSeconds && durationSeconds >= 45 * 60
      ? "Long Focus (50m)"
      : "Short Focus (25m)"
  }
  if (type === "short_break") {
    return "Short Break (5m)"
  }
  return "Long Break (15m)"
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
 * Calculates the adjusted started_at timestamp when resuming a paused session,
 * preserving exactly the remaining seconds and total session duration.
 */
export function calculateResumeStartedAt(
  durationSeconds: number,
  remainingSeconds: number,
  nowMs: number = Date.now()
): string {
  const elapsedSeconds = Math.max(0, durationSeconds - remainingSeconds)
  const adjustedStartMs = nowMs - elapsedSeconds * 1000
  return new Date(adjustedStartMs).toISOString()
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
    paused_at?: string | null
  } | null,
  now: number = Date.now(),
  defaultDurationSeconds: number = DEFAULT_DURATIONS.focus
): {
  state: PomodoroState
  remainingSeconds: number
  progress: number
  isCompleted: boolean
} {
  if (!session || session.ended_at !== null) {
    return {
      state: "IDLE",
      remainingSeconds: defaultDurationSeconds,
      progress: 0,
      isCompleted: false,
    }
  }

  // Handle paused session: calculate remaining seconds and progress at the pause timestamp
  if (session.paused_at) {
    const pausedMs = toTimestampMs(session.paused_at)
    const remainingSeconds = calculateRemainingSeconds(
      session.started_at,
      session.duration_seconds,
      pausedMs
    )
    const progress = calculateProgress(
      session.started_at,
      session.duration_seconds,
      pausedMs
    )

    return {
      state: "PAUSED",
      remainingSeconds,
      progress,
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
