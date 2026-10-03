import { describe, it, expect } from "vitest"
import {
  isReminderPastDue,
  formatReminderTimestamp,
  getReminderRelativeLabel,
  enrichReminder,
  filterReminders,
  deriveReminderCounts,
} from "@/lib/reminders/utils"
import type { Reminder } from "@/types/database"

describe("Reminders Domain Utilities & Past-Due Logic", () => {
  const baseNow = new Date("2026-10-03T10:00:00.000Z") // 15:30 IST

  const mockReminder: Reminder = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    user_id: "user-123",
    title: "Deploy release",
    remind_at: "2026-10-03T12:00:00.000Z", // In 2 hours
    completed: false,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  }

  describe("isReminderPastDue", () => {
    it("returns false for reminders scheduled in the future", () => {
      // Future
      expect(isReminderPastDue("2026-10-03T12:00:00.000Z", false, baseNow)).toBe(false)
    })

    it("returns true for uncompleted reminders whose scheduled time has passed", () => {
      // 1 hour ago
      expect(isReminderPastDue("2026-10-03T09:00:00.000Z", false, baseNow)).toBe(true)
    })

    it("returns false for completed reminders even if scheduled time has passed", () => {
      // Completed reminders are never marked as past-due
      expect(isReminderPastDue("2026-10-03T09:00:00.000Z", true, baseNow)).toBe(false)
    })
  })

  describe("formatReminderTimestamp", () => {
    it("formats reminder as 'Today at ...' when scheduled on the same calendar day in user timezone", () => {
      // 2026-10-03T10:00:00Z in Asia/Kolkata is 15:30 (3:30 PM)
      const label = formatReminderTimestamp("2026-10-03T10:00:00.000Z", "Asia/Kolkata", baseNow)
      expect(label).toContain("Today at")
      expect(label).toContain("3:30 PM")
    })

    it("formats reminder as 'Tomorrow at ...' when scheduled on the next calendar day in user timezone", () => {
      // Next day in Asia/Kolkata
      const label = formatReminderTimestamp("2026-10-04T03:30:00.000Z", "Asia/Kolkata", baseNow)
      expect(label).toContain("Tomorrow at")
      expect(label).toContain("9:00 AM")
    })

    it("formats reminder as 'Yesterday at ...' when scheduled on the previous calendar day in user timezone", () => {
      const label = formatReminderTimestamp("2026-10-02T10:00:00.000Z", "Asia/Kolkata", baseNow)
      expect(label).toContain("Yesterday at")
    })

    it("formats reminder with day and month when further out", () => {
      const label = formatReminderTimestamp("2026-10-10T09:00:00.000Z", "Asia/Kolkata", baseNow)
      expect(label).toContain("Oct 10")
    })
  })

  describe("getReminderRelativeLabel", () => {
    it("returns 'Completed' for completed reminders", () => {
      const result = getReminderRelativeLabel("2026-10-03T09:00:00.000Z", true, "Asia/Kolkata", baseNow)
      expect(result.label).toBe("Completed")
      expect(result.isPastDue).toBe(false)
    })

    it("returns past-due label with minutes for recently overdue reminders", () => {
      // Overdue by 30 mins
      const result = getReminderRelativeLabel("2026-10-03T09:30:00.000Z", false, "Asia/Kolkata", baseNow)
      expect(result.isPastDue).toBe(true)
      expect(result.label).toContain("Past due · 30m ago")
    })

    it("returns past-due label with hours for reminders overdue by hours", () => {
      // Overdue by 3 hours
      const result = getReminderRelativeLabel("2026-10-03T07:00:00.000Z", false, "Asia/Kolkata", baseNow)
      expect(result.isPastDue).toBe(true)
      expect(result.label).toContain("Past due · 3h ago")
    })

    it("returns 'In Xm' or 'In Xh' for upcoming reminders", () => {
      // In 45 mins
      const resultMin = getReminderRelativeLabel("2026-10-03T10:45:00.000Z", false, "Asia/Kolkata", baseNow)
      expect(resultMin.isPastDue).toBe(false)
      expect(resultMin.label).toBe("In 45m")

      // In 3 hours
      const resultHour = getReminderRelativeLabel("2026-10-03T13:00:00.000Z", false, "Asia/Kolkata", baseNow)
      expect(resultHour.isPastDue).toBe(false)
      expect(resultHour.label).toBe("In 3h")
    })
  })

  describe("filterReminders and deriveReminderCounts", () => {
    const list: Reminder[] = [
      {
        ...mockReminder,
        id: "1",
        title: "Future 1",
        remind_at: "2026-10-03T12:00:00.000Z", // Future
        completed: false,
      },
      {
        ...mockReminder,
        id: "2",
        title: "Future 2",
        remind_at: "2026-10-04T10:00:00.000Z", // Future
        completed: false,
      },
      {
        ...mockReminder,
        id: "3",
        title: "Overdue 1",
        remind_at: "2026-10-03T08:00:00.000Z", // Past
        completed: false,
      },
      {
        ...mockReminder,
        id: "4",
        title: "Completed Old",
        remind_at: "2026-10-02T10:00:00.000Z", // Past but completed
        completed: true,
      },
    ]

    it("computes accurate counts", () => {
      const counts = deriveReminderCounts(list, baseNow)
      expect(counts.total).toBe(4)
      expect(counts.upcoming).toBe(2)
      expect(counts.pastDue).toBe(1)
      expect(counts.completed).toBe(1)
    })

    it("filters correctly by 'upcoming'", () => {
      const filtered = filterReminders(list, "upcoming", baseNow)
      expect(filtered.length).toBe(2)
      expect(filtered.map((r) => r.id)).toEqual(["1", "2"])
    })

    it("filters correctly by 'past_due'", () => {
      const filtered = filterReminders(list, "past_due", baseNow)
      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe("3")
    })

    it("filters correctly by 'completed'", () => {
      const filtered = filterReminders(list, "completed", baseNow)
      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe("4")
    })

    it("returns all items when filter is 'all'", () => {
      const filtered = filterReminders(list, "all", baseNow)
      expect(filtered.length).toBe(4)
    })
  })

  describe("enrichReminder", () => {
    it("decorates reminder with isPastDue, formattedScheduledAt, and relativeLabel", () => {
      const enriched = enrichReminder(mockReminder, "Asia/Kolkata", baseNow)
      expect(enriched.id).toBe(mockReminder.id)
      expect(enriched.isPastDue).toBe(false)
      expect(enriched.formattedScheduledAt).toContain("Today at")
      expect(enriched.relativeLabel).toBe("In 2h")
    })
  })
})
