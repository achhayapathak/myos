import { describe, it, expect } from "vitest"
import {
  calculateRemainingSeconds,
  calculateElapsedSeconds,
  calculateProgress,
  isSessionCompleted,
  formatTimerDisplay,
  derivePomodoroState,
  DEFAULT_DURATIONS,
  POMODORO_MODES,
  MODE_DURATIONS,
  derivePomodoroMode,
  formatSessionLabel,
  calculateResumeStartedAt,
} from "@/lib/focus/timer-utils"

describe("Focus Timer Calculations (Timestamp Source of Truth)", () => {
  const baseStart = "2026-09-30T10:00:00.000Z"
  const baseStartMs = new Date(baseStart).getTime()
  const focusDuration = 25 * 60 // 1500 seconds

  describe("1. calculateRemainingSeconds", () => {
    it("returns full duration at session start", () => {
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, baseStartMs)
      expect(remaining).toBe(1500)
    })

    it("accurately computes remaining seconds as time advances", () => {
      // 5 minutes (300s) elapsed
      const fiveMinLater = baseStartMs + 300 * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, fiveMinLater)
      expect(remaining).toBe(1200) // 20 minutes left
    })

    it("returns 0 when session duration has exactly elapsed", () => {
      const endMs = baseStartMs + focusDuration * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, endMs)
      expect(remaining).toBe(0)
    })

    it("clamps to 0 when time exceeds duration", () => {
      // 1 hour later (exceeded 25 min)
      const oneHourLater = baseStartMs + 3600 * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, oneHourLater)
      expect(remaining).toBe(0)
    })

    it("handles Date objects and numeric epoch inputs identically", () => {
      const dateObj = new Date(baseStart)
      const fiveMinLater = baseStartMs + 300 * 1000

      const fromDate = calculateRemainingSeconds(dateObj, focusDuration, fiveMinLater)
      const fromNumber = calculateRemainingSeconds(baseStartMs, focusDuration, fiveMinLater)

      expect(fromDate).toBe(1200)
      expect(fromNumber).toBe(1200)
    })

    it("handles 0 or negative duration safely", () => {
      expect(calculateRemainingSeconds(baseStart, 0, baseStartMs)).toBe(0)
      expect(calculateRemainingSeconds(baseStart, -10, baseStartMs)).toBe(0)
    })
  })

  describe("2. calculateElapsedSeconds & calculateProgress", () => {
    it("calculates accurate elapsed seconds", () => {
      expect(calculateElapsedSeconds(baseStart, baseStartMs)).toBe(0)
      expect(calculateElapsedSeconds(baseStart, baseStartMs + 65 * 1000)).toBe(65)
    })

    it("clamps elapsed seconds to 0 if now is before started_at", () => {
      expect(calculateElapsedSeconds(baseStart, baseStartMs - 1000)).toBe(0)
    })

    it("calculates progress ratio from 0 to 1", () => {
      expect(calculateProgress(baseStart, focusDuration, baseStartMs)).toBe(0)
      expect(calculateProgress(baseStart, focusDuration, baseStartMs + 750 * 1000)).toBe(0.5)
      expect(calculateProgress(baseStart, focusDuration, baseStartMs + 1500 * 1000)).toBe(1)
      expect(calculateProgress(baseStart, focusDuration, baseStartMs + 3000 * 1000)).toBe(1)
    })
  })

  describe("3. isSessionCompleted", () => {
    it("returns false while session is active", () => {
      expect(isSessionCompleted(baseStart, focusDuration, baseStartMs + 1499 * 1000)).toBe(false)
    })

    it("returns true at or past target end timestamp", () => {
      expect(isSessionCompleted(baseStart, focusDuration, baseStartMs + 1500 * 1000)).toBe(true)
      expect(isSessionCompleted(baseStart, focusDuration, baseStartMs + 2000 * 1000)).toBe(true)
    })
  })

  describe("4. Sleep, Tab Backgrounding & Throttling Resilience", () => {
    it("preserves exact remaining time when laptop sleeps for 10 minutes", () => {
      // User starts 25m session, closes laptop for 10m (600s)
      const sleepWakeMs = baseStartMs + 600 * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, sleepWakeMs)

      // Expected: exactly 15 minutes left (900 seconds)
      expect(remaining).toBe(900)
      expect(isSessionCompleted(baseStart, focusDuration, sleepWakeMs)).toBe(false)
    })

    it("immediately identifies completion when laptop wakes up after 30 minutes", () => {
      // User was away for 30m on a 25m session
      const sleepWakeMs = baseStartMs + 1800 * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, sleepWakeMs)

      expect(remaining).toBe(0)
      expect(isSessionCompleted(baseStart, focusDuration, sleepWakeMs)).toBe(true)
    })

    it("computes accurately when JavaScript timers are throttled or delayed", () => {
      // Browser timer fired 3.4 seconds late
      const throttledNow = baseStartMs + 142.4 * 1000
      const remaining = calculateRemainingSeconds(baseStart, focusDuration, throttledNow)

      // 1500 - 142.4 = 1357.6 -> ceil gives 1358
      expect(remaining).toBe(1358)
    })
  })

  describe("5. formatTimerDisplay", () => {
    it("formats standard minutes and seconds", () => {
      expect(formatTimerDisplay(1500)).toBe("25:00")
      expect(formatTimerDisplay(300)).toBe("05:00")
      expect(formatTimerDisplay(900)).toBe("15:00")
      expect(formatTimerDisplay(65)).toBe("01:05")
      expect(formatTimerDisplay(9)).toBe("00:09")
      expect(formatTimerDisplay(0)).toBe("00:00")
    })

    it("clamps negative values to 00:00", () => {
      expect(formatTimerDisplay(-5)).toBe("00:00")
    })
  })

  describe("6. derivePomodoroState", () => {
    it("returns IDLE state when session is null or ended", () => {
      const idleNull = derivePomodoroState(null)
      expect(idleNull.state).toBe("IDLE")
      expect(idleNull.remainingSeconds).toBe(DEFAULT_DURATIONS.focus)
      expect(idleNull.isCompleted).toBe(false)

      const idleEnded = derivePomodoroState({
        type: "focus",
        started_at: baseStart,
        duration_seconds: focusDuration,
        ended_at: "2026-09-30T10:25:00.000Z",
      })
      expect(idleEnded.state).toBe("IDLE")
    })

    it("returns FOCUSING state for ongoing focus session", () => {
      const res = derivePomodoroState(
        {
          type: "focus",
          started_at: baseStart,
          duration_seconds: focusDuration,
          ended_at: null,
        },
        baseStartMs + 500 * 1000
      )

      expect(res.state).toBe("FOCUSING")
      expect(res.remainingSeconds).toBe(1000)
      expect(res.isCompleted).toBe(false)
    })

    it("returns FOCUS_COMPLETE state when focus session duration expires", () => {
      const res = derivePomodoroState(
        {
          type: "focus",
          started_at: baseStart,
          duration_seconds: focusDuration,
          ended_at: null,
        },
        baseStartMs + 1500 * 1000
      )

      expect(res.state).toBe("FOCUS_COMPLETE")
      expect(res.remainingSeconds).toBe(0)
      expect(res.isCompleted).toBe(true)
    })

    it("returns SHORT_BREAK for ongoing break session", () => {
      const breakDuration = 300 // 5m
      const res = derivePomodoroState(
        {
          type: "short_break",
          started_at: baseStart,
          duration_seconds: breakDuration,
          ended_at: null,
        },
        baseStartMs + 100 * 1000
      )

      expect(res.state).toBe("SHORT_BREAK")
      expect(res.remainingSeconds).toBe(200)
      expect(res.isCompleted).toBe(false)
    })

    it("returns BREAK_COMPLETE when break duration expires", () => {
      const breakDuration = 300
      const res = derivePomodoroState(
        {
          type: "short_break",
          started_at: baseStart,
          duration_seconds: breakDuration,
          ended_at: null,
        },
        baseStartMs + 301 * 1000
      )

      expect(res.state).toBe("BREAK_COMPLETE")
      expect(res.remainingSeconds).toBe(0)
      expect(res.isCompleted).toBe(true)
    })
  })

  describe("7. 50-minute Long Focus & Mode Naming", () => {
    const longFocusDuration = 50 * 60 // 3000 seconds

    it("accurately computes 50m session countdown", () => {
      // At start
      expect(calculateRemainingSeconds(baseStart, longFocusDuration, baseStartMs)).toBe(3000)

      // 20 minutes in
      const twentyMinLater = baseStartMs + 20 * 60 * 1000
      expect(calculateRemainingSeconds(baseStart, longFocusDuration, twentyMinLater)).toBe(1800)

      // At end
      const endMs = baseStartMs + 50 * 60 * 1000
      expect(calculateRemainingSeconds(baseStart, longFocusDuration, endMs)).toBe(0)
      expect(isSessionCompleted(baseStart, longFocusDuration, endMs)).toBe(true)
    })

    it("derives PomodoroMode distinctly for 25m and 50m focus and breaks", () => {
      expect(derivePomodoroMode("focus", 25 * 60)).toBe("short_focus")
      expect(derivePomodoroMode("focus", 50 * 60)).toBe("long_focus")
      expect(derivePomodoroMode("focus", 45 * 60)).toBe("custom_focus")
      expect(derivePomodoroMode("short_break", 5 * 60)).toBe("short_break")
      expect(derivePomodoroMode("short_break", 10 * 60)).toBe("custom_break")
      expect(derivePomodoroMode("long_break", 15 * 60)).toBe("long_break")
      expect(derivePomodoroMode("long_break", 20 * 60)).toBe("custom_break")
    })

    it("formats distinct labels for short, long, and custom focus and break sessions", () => {
      expect(formatSessionLabel("focus", 25 * 60)).toBe("Short Focus (25m)")
      expect(formatSessionLabel("focus", 50 * 60)).toBe("Long Focus (50m)")
      expect(formatSessionLabel("focus", 45 * 60)).toBe("Custom Focus (45m)")
      expect(formatSessionLabel("short_break", 5 * 60)).toBe("Short Break (5m)")
      expect(formatSessionLabel("short_break", 10 * 60)).toBe("Custom Break (10m)")
      expect(formatSessionLabel("long_break", 15 * 60)).toBe("Long Break (15m)")
      expect(formatSessionLabel("long_break", 20 * 60)).toBe("Custom Break (20m)")
    })

    it("configures all modes in POMODORO_MODES metadata", () => {
      expect(POMODORO_MODES.short_focus.durationMinutes).toBe(25)
      expect(POMODORO_MODES.short_focus.durationSeconds).toBe(1500)
      expect(POMODORO_MODES.short_focus.label).toBe("Short Focus")

      expect(POMODORO_MODES.long_focus.durationMinutes).toBe(50)
      expect(POMODORO_MODES.long_focus.durationSeconds).toBe(3000)
      expect(POMODORO_MODES.long_focus.label).toBe("Long Focus")

      expect(POMODORO_MODES.custom_focus.label).toBe("Custom Focus")

      expect(POMODORO_MODES.short_break.durationMinutes).toBe(5)
      expect(POMODORO_MODES.short_break.durationSeconds).toBe(300)
      expect(POMODORO_MODES.short_break.label).toBe("Short Break")

      expect(POMODORO_MODES.long_break.durationMinutes).toBe(15)
      expect(POMODORO_MODES.long_break.durationSeconds).toBe(900)
      expect(POMODORO_MODES.long_break.label).toBe("Long Break")

      expect(POMODORO_MODES.custom_break.label).toBe("Custom Break")

      expect(MODE_DURATIONS.short_focus).toBe(1500)
      expect(MODE_DURATIONS.long_focus).toBe(3000)
      expect(MODE_DURATIONS.short_break).toBe(300)
      expect(MODE_DURATIONS.long_break).toBe(900)
    })
  })

  describe("8. Pause & Resume Mechanics", () => {
    it("freezes timer in PAUSED state based on paused_at timestamp", () => {
      // 25 min (1500s) session started at baseStart
      // Paused 5 minutes (300s) in => remaining should be 1200s
      const pausedAt = new Date(baseStartMs + 300 * 1000).toISOString()
      const pausedSession = {
        type: "focus" as const,
        started_at: baseStart,
        duration_seconds: focusDuration,
        ended_at: null,
        paused_at: pausedAt,
      }

      // Even if current time is 2 hours later, remaining seconds is frozen at 1200
      const twoHoursLater = baseStartMs + 7200 * 1000
      const state = derivePomodoroState(pausedSession, twoHoursLater)

      expect(state.state).toBe("PAUSED")
      expect(state.remainingSeconds).toBe(1200)
      expect(state.progress).toBeCloseTo(300 / 1500, 2)
      expect(state.isCompleted).toBe(false)
    })

    it("calculates accurate resume started_at timestamp preserving remaining seconds", () => {
      // 50m (3000s) session paused with 1800s remaining
      const longDuration = 3000
      const remainingSeconds = 1800
      const resumeNowMs = baseStartMs + 10000 * 1000 // resumed hours later

      const newStartedAtIso = calculateResumeStartedAt(longDuration, remainingSeconds, resumeNowMs)

      // Elapsed seconds when resuming should be duration - remaining = 1200s (20m)
      const expectedNewStartMs = resumeNowMs - 1200 * 1000
      expect(new Date(newStartedAtIso).getTime()).toBe(expectedNewStartMs)

      // When calculateRemainingSeconds is immediately evaluated, it must match 1800s
      const calculatedRemaining = calculateRemainingSeconds(newStartedAtIso, longDuration, resumeNowMs)
      expect(calculatedRemaining).toBe(remainingSeconds)
    })

    it("handles resuming when remainingSeconds equals full duration", () => {
      const resumeNowMs = Date.now()
      const newStartedAtIso = calculateResumeStartedAt(1500, 1500, resumeNowMs)

      expect(new Date(newStartedAtIso).getTime()).toBe(resumeNowMs)
      expect(calculateRemainingSeconds(newStartedAtIso, 1500, resumeNowMs)).toBe(1500)
    })
  })
})

