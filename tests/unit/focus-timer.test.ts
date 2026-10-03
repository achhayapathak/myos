import { describe, it, expect } from "vitest"
import {
  calculateRemainingSeconds,
  calculateElapsedSeconds,
  calculateProgress,
  isSessionCompleted,
  formatTimerDisplay,
  derivePomodoroState,
  DEFAULT_DURATIONS,
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
})
