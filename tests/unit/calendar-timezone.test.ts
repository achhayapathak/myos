import { describe, it, expect } from "vitest"
import {
  localToUtc,
  utcToLocalDateParts,
  computeAllDayUtcRange,
  toFullCalendarEvent,
  formatEventTimeRange,
  formatEventDate,
  resolveTimeZone,
  isValidTimeZone,
  DEFAULT_TIMEZONE,
  addDaysToDateStr,
} from "@/lib/calendar/timezone-utils"
import type { Event as DbEvent } from "@/types/database"

describe("Calendar Timezone Utilities", () => {
  describe("resolveTimeZone & isValidTimeZone", () => {
    it("recognizes valid IANA timezones", () => {
      expect(isValidTimeZone("Asia/Kolkata")).toBe(true)
      expect(isValidTimeZone("UTC")).toBe(true)
      expect(isValidTimeZone("America/New_York")).toBe(true)
      expect(isValidTimeZone("Europe/London")).toBe(true)
    })

    it("rejects invalid timezones", () => {
      expect(isValidTimeZone("Invalid/Zone")).toBe(false)
      expect(isValidTimeZone("")).toBe(false)
    })

    it("falls back to DEFAULT_TIMEZONE (Asia/Kolkata) on invalid or undefined input", () => {
      expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIMEZONE)
      expect(resolveTimeZone(null)).toBe(DEFAULT_TIMEZONE)
      expect(resolveTimeZone("Not/Real")).toBe(DEFAULT_TIMEZONE)
      expect(resolveTimeZone("America/New_York")).toBe("America/New_York")
    })
  })

  describe("localToUtc conversion", () => {
    it("converts Asia/Kolkata (+05:30) local time to exact UTC", () => {
      // 14:30 IST is 09:00 UTC (14:30 - 5:30)
      const utc = localToUtc("2026-10-03", "14:30", "Asia/Kolkata")
      expect(utc).toBe("2026-10-03T09:00:00.000Z")
    })

    it("converts Asia/Kolkata midnight to previous day in UTC", () => {
      // 00:00 IST on Oct 3 is 18:30 UTC on Oct 2
      const utc = localToUtc("2026-10-03", "00:00:00", "Asia/Kolkata")
      expect(utc).toBe("2026-10-02T18:30:00.000Z")
    })

    it("converts Asia/Kolkata 23:59:59 to UTC", () => {
      // 23:59:59 IST on Oct 3 is 18:29:59 UTC on Oct 3
      const utc = localToUtc("2026-10-03", "23:59:59", "Asia/Kolkata")
      expect(utc).toBe("2026-10-03T18:29:59.000Z")
    })

    it("converts UTC timezone correctly with zero offset", () => {
      const utc = localToUtc("2026-10-03", "14:30", "UTC")
      expect(utc).toBe("2026-10-03T14:30:00.000Z")
    })

    it("handles Daylight Saving Time in America/New_York (EDT vs EST)", () => {
      // Summer (EDT = UTC-4): 10:00 NY is 14:00 UTC
      const utcSummer = localToUtc("2026-07-04", "10:00", "America/New_York")
      expect(utcSummer).toBe("2026-07-04T14:00:00.000Z")

      // Winter (EST = UTC-5): 10:00 NY is 15:00 UTC
      const utcWinter = localToUtc("2026-01-15", "10:00", "America/New_York")
      expect(utcWinter).toBe("2026-01-15T15:00:00.000Z")
    })

    it("converts Asia/Tokyo (UTC+9) correctly", () => {
      // 09:00 Tokyo on Oct 3 is 00:00 UTC on Oct 3
      const utc = localToUtc("2026-10-03", "09:00", "Asia/Tokyo")
      expect(utc).toBe("2026-10-03T00:00:00.000Z")
    })
  })

  describe("utcToLocalDateParts conversion", () => {
    it("converts UTC ISO string back to Asia/Kolkata date and time parts", () => {
      const parts = utcToLocalDateParts("2026-10-03T09:00:00.000Z", "Asia/Kolkata")
      expect(parts.date).toBe("2026-10-03")
      expect(parts.time).toBe("14:30")
      expect(parts.dateTimeLocal).toBe("2026-10-03T14:30")
      expect(parts.year).toBe(2026)
      expect(parts.month).toBe(10)
      expect(parts.day).toBe(3)
      expect(parts.hour).toBe(14)
      expect(parts.minute).toBe(30)
    })

    it("converts UTC timestamp that rolls past midnight in Asia/Kolkata", () => {
      // 2026-10-02 20:00 UTC is 2026-10-03 01:30 IST (+5:30)
      const parts = utcToLocalDateParts("2026-10-02T20:00:00.000Z", "Asia/Kolkata")
      expect(parts.date).toBe("2026-10-03")
      expect(parts.time).toBe("01:30")
      expect(parts.day).toBe(3)
    })

    it("performs lossless round-trip conversions (local -> UTC -> local)", () => {
      const initialDate = "2026-10-03"
      const initialTime = "16:45"
      const tz = "Asia/Kolkata"

      const utc = localToUtc(initialDate, initialTime, tz)
      const roundTrip = utcToLocalDateParts(utc, tz)

      expect(roundTrip.date).toBe(initialDate)
      expect(roundTrip.time).toBe(initialTime)
    })
  })

  describe("computeAllDayUtcRange", () => {
    it("computes exact start and end UTC bounds for single-day all-day event in Asia/Kolkata", () => {
      const range = computeAllDayUtcRange("2026-10-03", "2026-10-03", "Asia/Kolkata")

      // Midnight Oct 3 in IST -> Oct 2 18:30:00.000Z
      expect(range.start_at).toBe("2026-10-02T18:30:00.000Z")

      // End of Oct 3 in IST (23:59:59.999) -> Oct 3 18:29:59.999Z
      expect(range.end_at).toBe("2026-10-03T18:29:59.999Z")

      // Ensure start_at is before end_at
      expect(new Date(range.start_at).getTime()).toBeLessThan(new Date(range.end_at).getTime())
    })

    it("handles multi-day all-day events", () => {
      const range = computeAllDayUtcRange("2026-10-03", "2026-10-05", "Asia/Kolkata")

      expect(range.start_at).toBe("2026-10-02T18:30:00.000Z")
      expect(range.end_at).toBe("2026-10-05T18:29:59.999Z")
    })
  })

  describe("addDaysToDateStr helper", () => {
    it("adds days across regular dates and month boundaries", () => {
      expect(addDaysToDateStr("2026-10-03", 1)).toBe("2026-10-04")
      expect(addDaysToDateStr("2026-10-31", 1)).toBe("2026-11-01")
      expect(addDaysToDateStr("2026-12-31", 1)).toBe("2027-01-01")
    })
  })

  describe("toFullCalendarEvent", () => {
    const mockDbEvent: DbEvent = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "user-1",
      title: "Sprint Planning",
      description: "Discuss Q4 roadmap",
      start_at: "2026-10-03T09:00:00.000Z",
      end_at: "2026-10-03T10:00:00.000Z",
      all_day: false,
      created_at: "2026-10-01T00:00:00.000Z",
      updated_at: "2026-10-01T00:00:00.000Z",
    }

    it("maps timed events to FullCalendar event format preserving UTC ISO strings", () => {
      const fcEvent = toFullCalendarEvent(mockDbEvent, "Asia/Kolkata")

      expect(fcEvent.id).toBe(mockDbEvent.id)
      expect(fcEvent.title).toBe("Sprint Planning")
      expect(fcEvent.description).toBe("Discuss Q4 roadmap")
      expect(fcEvent.allDay).toBe(false)
      expect(fcEvent.start).toBe("2026-10-03T09:00:00.000Z")
      expect(fcEvent.end).toBe("2026-10-03T10:00:00.000Z")
    })

    it("maps all-day events with local date and exclusive next-day end date for FullCalendar", () => {
      const mockAllDayEvent: DbEvent = {
        ...mockDbEvent,
        all_day: true,
        // Oct 3 in Asia/Kolkata
        start_at: "2026-10-02T18:30:00.000Z",
        end_at: "2026-10-03T18:29:59.999Z",
      }

      const fcEvent = toFullCalendarEvent(mockAllDayEvent, "Asia/Kolkata")

      expect(fcEvent.allDay).toBe(true)
      expect(fcEvent.start).toBe("2026-10-03")
      // End date must be exclusive next day (2026-10-04)
      expect(fcEvent.end).toBe("2026-10-04")
    })
  })

  describe("formatEventTimeRange and formatEventDate", () => {
    it("formats all-day events as 'All Day'", () => {
      const label = formatEventTimeRange(
        "2026-10-02T18:30:00.000Z",
        "2026-10-03T18:29:59.999Z",
        true,
        "Asia/Kolkata"
      )
      expect(label).toBe("All Day")
    })

    it("formats timed events with start and end times in user timezone", () => {
      // 09:00 UTC to 10:30 UTC -> 2:30 PM to 4:00 PM IST
      const label = formatEventTimeRange(
        "2026-10-03T09:00:00.000Z",
        "2026-10-03T10:30:00.000Z",
        false,
        "Asia/Kolkata"
      )
      expect(label).toContain("2:30")
      expect(label).toContain("4:00")
    })

    it("formats single start time if end time is null", () => {
      const label = formatEventTimeRange(
        "2026-10-03T09:00:00.000Z",
        null,
        false,
        "Asia/Kolkata"
      )
      expect(label).toContain("2:30")
    })

    it("formats date nicely in user timezone", () => {
      const str = formatEventDate("2026-10-03T09:00:00.000Z", "Asia/Kolkata")
      expect(str).toContain("Oct 3, 2026")
    })
  })
})
