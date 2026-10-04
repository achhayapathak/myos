import { describe, it, expect } from "vitest"
import {
  isHabitScheduledForDate,
  getScheduledDates,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateCompletionRate,
  getHabitScheduleDescription,
  getISOWeekday,
  getLocalDateString,
  addDays,
  getDatesInRange,
  formatHabitReminderTime,
} from "@/lib/habits/calculations"

describe("Habit Calculations & Scheduling Unit Tests", () => {
  // =========================================================================
  // 1. SCHEDULING TESTS
  // =========================================================================
  describe("1. Habit Scheduling", () => {
    it("schedules daily habits on every day of the week", () => {
      const dailyHabit = { frequency_type: "daily" as const }

      // 2026-10-05 is Monday, 2026-10-11 is Sunday
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-05")).toBe(true) // Mon
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-06")).toBe(true) // Tue
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-07")).toBe(true) // Wed
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-08")).toBe(true) // Thu
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-09")).toBe(true) // Fri
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-10")).toBe(true) // Sat
      expect(isHabitScheduledForDate(dailyHabit, "2026-10-11")).toBe(true) // Sun
    })

    it("schedules weekly habits only on target ISO weekdays (Mon/Wed/Fri)", () => {
      const mwfHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5], // Monday, Wednesday, Friday
      }

      expect(isHabitScheduledForDate(mwfHabit, "2026-10-05")).toBe(true) // Mon
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-06")).toBe(false) // Tue
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-07")).toBe(true) // Wed
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-08")).toBe(false) // Thu
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-09")).toBe(true) // Fri
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-10")).toBe(false) // Sat
      expect(isHabitScheduledForDate(mwfHabit, "2026-10-11")).toBe(false) // Sun
    })

    it("schedules Monday-Friday weekday habit correctly", () => {
      const weekdayHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 2, 3, 4, 5],
      }

      // Monday through Friday must be true
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-05")).toBe(true)
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-06")).toBe(true)
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-07")).toBe(true)
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-08")).toBe(true)
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-09")).toBe(true)

      // Saturday and Sunday must be false
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-10")).toBe(false)
      expect(isHabitScheduledForDate(weekdayHabit, "2026-10-11")).toBe(false)
    })

    it("schedules weekend-only habit correctly", () => {
      const weekendHabit = {
        frequency_type: "weekly" as const,
        target_days: [6, 7], // Saturday, Sunday
      }

      expect(isHabitScheduledForDate(weekendHabit, "2026-10-05")).toBe(false) // Mon
      expect(isHabitScheduledForDate(weekendHabit, "2026-10-09")).toBe(false) // Fri
      expect(isHabitScheduledForDate(weekendHabit, "2026-10-10")).toBe(true) // Sat
      expect(isHabitScheduledForDate(weekendHabit, "2026-10-11")).toBe(true) // Sun
    })

    it("returns empty scheduled dates if startDate is after endDate", () => {
      const habit = { frequency_type: "daily" as const }
      const dates = getScheduledDates(habit, "2026-10-10", "2026-10-05")
      expect(dates).toEqual([])
    })

    it("correctly lists scheduled dates in range for weekly habit", () => {
      const mwfHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5],
      }
      const scheduled = getScheduledDates(mwfHabit, "2026-10-05", "2026-10-11")
      expect(scheduled).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"])
    })
  })

  // =========================================================================
  // 2. CURRENT STREAK TESTS
  // =========================================================================
  describe("2. Current Streak Calculation", () => {
    it("calculates current streak when daily habit is completed today", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      const completed = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]
      const today = "2026-10-05"

      const streak = calculateCurrentStreak(dailyHabit, completed, today)
      expect(streak).toBe(5)
    })

    it("preserves current streak when daily habit is completed up to yesterday and today is in-progress", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      // Completed up to Oct 4; today is Oct 5 (not completed yet)
      const completed = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]
      const today = "2026-10-05"

      const streak = calculateCurrentStreak(dailyHabit, completed, today)
      // The user still has today to complete it; streak earned up to yesterday is 4
      expect(streak).toBe(4)
    })

    it("returns streak of 1 when completed today but missed yesterday", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      const completed = ["2026-10-05"]
      const today = "2026-10-05"

      const streak = calculateCurrentStreak(dailyHabit, completed, today)
      expect(streak).toBe(1)
    })

    it("returns 0 when missed yesterday and not yet completed today", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      // Last completed on Oct 3; yesterday Oct 4 missed; today Oct 5 not completed
      const completed = ["2026-10-01", "2026-10-02", "2026-10-03"]
      const today = "2026-10-05"

      const streak = calculateCurrentStreak(dailyHabit, completed, today)
      expect(streak).toBe(0)
    })

    it("calculates weekly habit streak without counting unscheduled days as missed", () => {
      // Habit: Gym on Monday (1), Wednesday (3), Friday (5)
      const gymHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5],
      }

      // Monday Oct 5 ✓, Wednesday Oct 7 ✓, Friday Oct 9 ✓
      const completed = ["2026-10-05", "2026-10-07", "2026-10-09"]

      // On Saturday Oct 10 (unscheduled day): streak should be 3
      expect(calculateCurrentStreak(gymHabit, completed, "2026-10-10")).toBe(3)

      // On Sunday Oct 11 (unscheduled day): streak should still be 3
      expect(calculateCurrentStreak(gymHabit, completed, "2026-10-11")).toBe(3)

      // On Monday Oct 12 morning (scheduled, not yet completed): streak is still 3
      expect(calculateCurrentStreak(gymHabit, completed, "2026-10-12")).toBe(3)

      // After completing Monday Oct 12: streak becomes 4
      const completedWithMonday = [...completed, "2026-10-12"]
      expect(calculateCurrentStreak(gymHabit, completedWithMonday, "2026-10-12")).toBe(4)
    })

    it("resets weekly streak when a scheduled target day is missed", () => {
      const gymHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5],
      }

      // Completed Mon Oct 5, Wed Oct 7, Fri Oct 9
      // Missed Mon Oct 12
      // Now it is Tuesday Oct 13
      const completed = ["2026-10-05", "2026-10-07", "2026-10-09"]
      const streakOnTuesday = calculateCurrentStreak(gymHabit, completed, "2026-10-13")

      // Most recent scheduled day was Mon Oct 12, which was missed!
      expect(streakOnTuesday).toBe(0)
    })

    it("handles habit with zero completions", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      expect(calculateCurrentStreak(dailyHabit, [], "2026-10-05")).toBe(0)
    })
  })

  // =========================================================================
  // 3. LONGEST STREAK TESTS
  // =========================================================================
  describe("3. Longest Streak Calculation", () => {
    it("returns 0 for empty completion history", () => {
      const habit = { frequency_type: "daily" as const }
      expect(calculateLongestStreak(habit, [])).toBe(0)
    })

    it("calculates longest streak correctly for daily habit across gaps", () => {
      const dailyHabit = { frequency_type: "daily" as const }

      // 4-day streak (Oct 1..4), 1 missed day (Oct 5), 2-day streak (Oct 6..7)
      const completed = [
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
        "2026-10-06",
        "2026-10-07",
      ]

      const longest = calculateLongestStreak(dailyHabit, completed, {
        endDateStr: "2026-10-07",
      })
      expect(longest).toBe(4)
    })

    it("calculates longest streak for weekly habit across schedule", () => {
      const mwfHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5], // Mon, Wed, Fri
      }

      // Week 1: Mon Oct 5, Wed Oct 7, Fri Oct 9 (3 in a row)
      // Week 2: Mon Oct 12, Wed Oct 14, Fri Oct 16 (now 6 in a row)
      // Week 3: Mon Oct 19 missed, Wed Oct 21, Fri Oct 23 (2 in a row)
      const completed = [
        "2026-10-05",
        "2026-10-07",
        "2026-10-09",
        "2026-10-12",
        "2026-10-14",
        "2026-10-16",
        "2026-10-21",
        "2026-10-23",
      ]

      const longest = calculateLongestStreak(mwfHabit, completed, {
        endDateStr: "2026-10-25",
      })
      expect(longest).toBe(6)
    })
  })

  // =========================================================================
  // 4. COMPLETION RATE TESTS
  // =========================================================================
  describe("4. Completion Rate Calculation", () => {
    it("calculates 83.3% for daily habit with 25 completions over 30 days", () => {
      const dailyHabit = { frequency_type: "daily" as const }
      const dates = getDatesInRange("2026-09-01", "2026-09-30") // exactly 30 days
      expect(dates.length).toBe(30)

      // Take first 25 dates as completed
      const completed = dates.slice(0, 25)

      const rate = calculateCompletionRate(dailyHabit, completed, "2026-09-01", "2026-09-30")
      expect(rate).toBe(83.3) // 25 / 30 = 83.333% -> 83.3%
    })

    it("counts only target days in denominator for weekly habits", () => {
      // Habit: Mon/Wed/Fri (3 occurrences per week)
      // Over 4 full weeks (28 calendar days), there are exactly 12 scheduled target days
      const mwfHabit = {
        frequency_type: "weekly" as const,
        target_days: [1, 3, 5],
      }

      const scheduled = getScheduledDates(mwfHabit, "2026-10-05", "2026-11-01")
      expect(scheduled.length).toBe(12) // 4 weeks * 3 days

      // Completed 10 of the 12 scheduled days
      const completed = scheduled.slice(0, 10)

      const rate = calculateCompletionRate(mwfHabit, completed, "2026-10-05", "2026-11-01")
      // 10 / 12 = 83.333% -> 83.3%
      expect(rate).toBe(83.3)
    })

    it("does not count unscheduled days as failures", () => {
      const weekendHabit = {
        frequency_type: "weekly" as const,
        target_days: [6, 7], // 2 days per week
      }

      // Over 1 week (Mon Oct 5 to Sun Oct 11), scheduled days are Sat Oct 10 and Sun Oct 11
      const scheduled = getScheduledDates(weekendHabit, "2026-10-05", "2026-10-11")
      expect(scheduled).toEqual(["2026-10-10", "2026-10-11"])

      // Completed both Sat and Sun
      const completed = ["2026-10-10", "2026-10-11"]
      const rate = calculateCompletionRate(weekendHabit, completed, "2026-10-05", "2026-10-11")
      // Completed 2 of 2 scheduled = 100%, even though Mon-Fri were not done
      expect(rate).toBe(100)
    })

    it("returns 0% when no scheduled occurrences exist or none completed", () => {
      const habit = { frequency_type: "daily" as const }
      expect(calculateCompletionRate(habit, [], "2026-10-01", "2026-10-10")).toBe(0)
    })
  })

  // =========================================================================
  // 5. SCHEDULE DESCRIPTION & TIMEZONE / DATE BOUNDARIES
  // =========================================================================
  describe("5. Schedule Description & Date Formatting", () => {
    it("formats human-readable schedule descriptions", () => {
      expect(getHabitScheduleDescription({ frequency_type: "daily" })).toBe("Daily")
      expect(
        getHabitScheduleDescription({
          frequency_type: "weekly",
          target_days: [1, 2, 3, 4, 5],
        })
      ).toBe("Weekdays")
      expect(
        getHabitScheduleDescription({
          frequency_type: "weekly",
          target_days: [6, 7],
        })
      ).toBe("Weekends")
      expect(
        getHabitScheduleDescription({
          frequency_type: "weekly",
          target_days: [1, 3, 5],
        })
      ).toBe("Mon, Wed, Fri")
      expect(
        getHabitScheduleDescription({
          frequency_type: "weekly",
          target_days: [1, 2, 3, 4, 5, 6, 7],
        })
      ).toBe("Every day")
    })

    it("accurately computes ISO weekdays for known calendar dates", () => {
      // 2026-10-05 is Monday (1)
      expect(getISOWeekday("2026-10-05")).toBe(1)
      // 2026-10-10 is Saturday (6)
      expect(getISOWeekday("2026-10-10")).toBe(6)
      // 2026-10-11 is Sunday (7)
      expect(getISOWeekday("2026-10-11")).toBe(7)
    })

    it("accurately steps across month boundaries and leap year days", () => {
      expect(addDays("2026-02-28", 1)).toBe("2026-03-01") // Non-leap year
      expect(addDays("2024-02-28", 1)).toBe("2024-02-29") // Leap year
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01") // Year boundary
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31") // Negative step
    })

    it("formats local calendar date string according to specified timezone", () => {
      // UTC time: 2026-10-04 20:00:00 UTC
      // In Asia/Kolkata (+05:30), it is 2026-10-05 01:30:00 AM (the next day!)
      const testUtcDate = new Date("2026-10-04T20:00:00.000Z")

      const kolkataDateStr = getLocalDateString(testUtcDate, "Asia/Kolkata")
      expect(kolkataDateStr).toBe("2026-10-05")

      const newYorkDateStr = getLocalDateString(testUtcDate, "America/New_York")
      expect(newYorkDateStr).toBe("2026-10-04")
    })

    it("formats 24-hour HH:mm time string into 12-hour AM/PM format", () => {
      expect(formatHabitReminderTime("08:30")).toBe("8:30 AM")
      expect(formatHabitReminderTime("00:00")).toBe("12:00 AM")
      expect(formatHabitReminderTime("12:00")).toBe("12:00 PM")
      expect(formatHabitReminderTime("13:45")).toBe("1:45 PM")
      expect(formatHabitReminderTime("20:00")).toBe("8:00 PM")
      expect(formatHabitReminderTime("23:59")).toBe("11:59 PM")
      expect(formatHabitReminderTime(null)).toBe("")
      expect(formatHabitReminderTime(undefined)).toBe("")
    })
  })
})
