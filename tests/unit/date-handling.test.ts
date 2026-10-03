import { describe, it, expect } from "vitest"
import {
  getTodayDateBounds,
  formatEventTime,
  getTaskDueLabel,
} from "@/lib/today-utils"

/**
 * Date Handling Unit Tests
 *
 * Tests for getTodayDateBounds, formatEventTime, and getTaskDueLabel.
 * All are pure functions — no mocking required.
 */
describe("Date Handling Utilities (today-utils.ts)", () => {
  // Fixed reference point: 2026-10-03 06:00 UTC = 11:30 IST
  const IST_TZ = "Asia/Kolkata" // UTC+5:30

  // -----------------------------------------------------------------------
  // getTodayDateBounds
  // -----------------------------------------------------------------------
  describe("getTodayDateBounds", () => {
    it("returns correct dateStr for a well-known timezone (UTC)", () => {
      const bounds = getTodayDateBounds("UTC")
      // The format must be YYYY-MM-DD
      expect(bounds.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("returns startISO that is earlier than endISO by exactly 24 hours minus 1ms", () => {
      const bounds = getTodayDateBounds("UTC")
      const start = new Date(bounds.startISO).getTime()
      const end = new Date(bounds.endISO).getTime()
      expect(end - start).toBe(24 * 60 * 60 * 1000 - 1)
    })

    it("startISO falls at midnight local time for Asia/Kolkata (UTC+5:30)", () => {
      const bounds = getTodayDateBounds(IST_TZ)
      const startUtc = new Date(bounds.startISO)

      // Format start time in IST — should be 00:00
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      const timeParts = formatter.format(startUtc)
      expect(timeParts).toBe("00:00:00")
    })

    it("endISO falls just before midnight local time for Asia/Kolkata", () => {
      const bounds = getTodayDateBounds(IST_TZ)
      const endUtc = new Date(bounds.endISO)

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      const timeParts = formatter.format(endUtc)
      expect(timeParts).toBe("23:59:59")
    })

    it("falls back gracefully to UTC when an invalid timezone is provided", () => {
      const bounds = getTodayDateBounds("Not/A/Timezone")
      expect(bounds.timeZone).toBe("UTC")
      expect(bounds.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("returns a non-empty formattedDate string", () => {
      const bounds = getTodayDateBounds("Europe/London")
      expect(bounds.formattedDate).toBeTruthy()
      expect(typeof bounds.formattedDate).toBe("string")
    })

    it("returns one of four expected greeting messages", () => {
      const validGreetings = ["Good morning", "Good afternoon", "Good evening", "Good night", "Good day"]
      const bounds = getTodayDateBounds("UTC")
      expect(validGreetings).toContain(bounds.greeting)
    })

    it("handles US/Eastern (UTC-5) with correct midnight boundary", () => {
      const bounds = getTodayDateBounds("America/New_York")
      const startUtc = new Date(bounds.startISO)

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      expect(formatter.format(startUtc)).toBe("00:00:00")
    })
  })

  // -----------------------------------------------------------------------
  // formatEventTime
  // -----------------------------------------------------------------------
  describe("formatEventTime", () => {
    const startUtc = "2026-10-03T10:00:00.000Z" // 15:30 IST
    const endUtc = "2026-10-03T11:30:00.000Z" // 17:00 IST

    it("returns 'All Day' for all-day events", () => {
      expect(formatEventTime(startUtc, null, true, IST_TZ)).toBe("All Day")
      expect(formatEventTime(startUtc, endUtc, true, IST_TZ)).toBe("All Day")
    })

    it("returns formatted start time when no end time is provided", () => {
      const result = formatEventTime(startUtc, null, false, IST_TZ)
      expect(result).toContain("3:30 PM")
      expect(result).not.toContain("–")
    })

    it("returns a time range when both start and end are provided", () => {
      const result = formatEventTime(startUtc, endUtc, false, IST_TZ)
      expect(result).toContain("3:30 PM")
      expect(result).toContain("5:00 PM")
      expect(result).toContain("–")
    })

    it("correctly converts UTC to US/Eastern timezone", () => {
      // 10:00 UTC = 06:00 EDT (UTC-4 in October)
      const result = formatEventTime(startUtc, null, false, "America/New_York")
      expect(result).toContain("6:00 AM")
    })
  })

  // -----------------------------------------------------------------------
  // getTaskDueLabel
  // -----------------------------------------------------------------------
  describe("getTaskDueLabel", () => {
    // today: 2026-10-03T00:00:00 IST to 2026-10-03T23:59:59 IST
    // In UTC: 2026-10-02T18:30:00Z to 2026-10-03T18:29:59Z
    const startISO = "2026-10-02T18:30:00.000Z"
    const endISO = "2026-10-03T18:29:59.999Z"

    it("returns empty label for tasks without a due date", () => {
      const result = getTaskDueLabel(null, startISO, endISO, IST_TZ)
      expect(result.label).toBe("")
      expect(result.isOverdue).toBe(false)
    })

    it("returns 'Overdue' for tasks due before today's start", () => {
      const yesterday = "2026-10-01T12:00:00.000Z"
      const result = getTaskDueLabel(yesterday, startISO, endISO, IST_TZ)
      expect(result.label).toBe("Overdue")
      expect(result.isOverdue).toBe(true)
    })

    it("returns 'Today' for tasks due during today's window", () => {
      // Due at midnight UTC (= 05:30 IST today), which has no hour/minute in the UTC date
      const todayMidnight = "2026-10-03T00:00:00.000Z"
      const result = getTaskDueLabel(todayMidnight, startISO, endISO, IST_TZ)
      // Could be Today or Today, <time> depending on hour==0 && min==0 check
      expect(result.isOverdue).toBe(false)
      expect(result.label).toMatch(/Today/)
    })

    it("returns today label with time for tasks with a specific time today", () => {
      // 10:00 UTC = 15:30 IST, within today's window
      const todayWithTime = "2026-10-03T10:00:00.000Z"
      const result = getTaskDueLabel(todayWithTime, startISO, endISO, IST_TZ)
      expect(result.label).toMatch(/Today/)
      expect(result.isOverdue).toBe(false)
    })

    it("returns a short date label for tasks due in the future", () => {
      const nextWeek = "2026-10-10T10:00:00.000Z"
      const result = getTaskDueLabel(nextWeek, startISO, endISO, IST_TZ)
      expect(result.label).not.toBe("Overdue")
      expect(result.label).not.toMatch(/Today/)
      expect(result.isOverdue).toBe(false)
      expect(result.label.length).toBeGreaterThan(0)
    })

    it("marks overdue correctly for tasks due exactly at start boundary minus 1ms", () => {
      const justBeforeToday = new Date(new Date(startISO).getTime() - 1).toISOString()
      const result = getTaskDueLabel(justBeforeToday, startISO, endISO, IST_TZ)
      expect(result.isOverdue).toBe(true)
    })
  })
})
