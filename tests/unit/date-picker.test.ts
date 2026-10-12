import { describe, it, expect } from "vitest"
import {
  formatYearMonthDay,
  getTodayDateString,
  getTomorrowDateString,
  getDateButtonLabel,
  getCalendarGridCells,
} from "@/components/ui/date-picker"

describe("DatePicker & CalendarDropdown Utilities", () => {
  describe("formatYearMonthDay", () => {
    it("formats year, monthIndex (0-based), and day into YYYY-MM-DD", () => {
      expect(formatYearMonthDay(2026, 9, 15)).toBe("2026-10-15")
      expect(formatYearMonthDay(2026, 0, 1)).toBe("2026-01-01")
      expect(formatYearMonthDay(2026, 11, 31)).toBe("2026-12-31")
    })

    it("correctly handles adjacent month overflows without timezone distortion", () => {
      // Month -1 from 2026 Jan -> 2025 Dec
      expect(formatYearMonthDay(2026, -1, 31)).toBe("2025-12-31")
      // Month 12 from 2026 Dec -> 2027 Jan
      expect(formatYearMonthDay(2026, 12, 1)).toBe("2027-01-01")
    })

    it("handles leap years accurately (e.g. 2028 Feb 29)", () => {
      expect(formatYearMonthDay(2028, 1, 29)).toBe("2028-02-29")
    })
  })

  describe("getTodayDateString and getTomorrowDateString", () => {
    it("returns ISO date format YYYY-MM-DD", () => {
      const today = getTodayDateString()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("computes tomorrow's date string consistently from today", () => {
      const tomorrow = getTomorrowDateString("2026-10-31")
      expect(tomorrow).toBe("2026-11-01")

      const yearEndTomorrow = getTomorrowDateString("2026-12-31")
      expect(yearEndTomorrow).toBe("2027-01-01")
    })
  })

  describe("getDateButtonLabel", () => {
    const today = "2026-10-12"
    const tomorrow = "2026-10-13"

    it("returns 'Pick a date' when no date is supplied", () => {
      expect(getDateButtonLabel("", today, tomorrow)).toBe("Pick a date")
    })

    it("returns 'Today' when date matches today", () => {
      expect(getDateButtonLabel("2026-10-12", today, tomorrow)).toBe("Today")
    })

    it("returns 'Tomorrow' when date matches tomorrow", () => {
      expect(getDateButtonLabel("2026-10-13", today, tomorrow)).toBe("Tomorrow")
    })

    it("returns localized short month and day for other dates", () => {
      const label = getDateButtonLabel("2026-10-25", today, tomorrow)
      expect(label).toBe("Oct 25")
    })
  })

  describe("getCalendarGridCells", () => {
    it("always produces exactly 42 cells (6 rows x 7 days) for a stable calendar grid", () => {
      // October 2026 (starts on Thursday, 31 days)
      const oct2026 = getCalendarGridCells(2026, 9)
      expect(oct2026).toHaveLength(42)

      // February 2026 (non-leap year, 28 days)
      const feb2026 = getCalendarGridCells(2026, 1)
      expect(feb2026).toHaveLength(42)

      // February 2028 (leap year, 29 days)
      const feb2028 = getCalendarGridCells(2028, 1)
      expect(feb2028).toHaveLength(42)
    })

    it("correctly identifies leading days from the previous month", () => {
      // Oct 1 2026 is Thursday (getDay() = 4), so 4 leading days: Sep 27, 28, 29, 30
      const oct2026 = getCalendarGridCells(2026, 9)

      expect(oct2026[0]).toEqual({
        dateStr: "2026-09-27",
        day: 27,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      })
      expect(oct2026[3]).toEqual({
        dateStr: "2026-09-30",
        day: 30,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      })

      // Oct 1 is cell index 4
      expect(oct2026[4]).toEqual({
        dateStr: "2026-10-01",
        day: 1,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      })
    })

    it("correctly identifies current month days and trailing days from the next month", () => {
      const oct2026 = getCalendarGridCells(2026, 9)

      // Oct 31 is day 31, index 4 + 31 - 1 = 34
      expect(oct2026[34]).toEqual({
        dateStr: "2026-10-31",
        day: 31,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      })

      // Next month starts at index 35 (Nov 1) through index 41 (Nov 7)
      expect(oct2026[35]).toEqual({
        dateStr: "2026-11-01",
        day: 1,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      })
      expect(oct2026[41]).toEqual({
        dateStr: "2026-11-07",
        day: 7,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      })
    })
  })
})
