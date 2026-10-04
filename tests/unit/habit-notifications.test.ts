import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { reminderTimeSchema, createHabitSchema, updateHabitSchema } from "@/lib/habits/validation"
import { NotificationService } from "@/lib/notifications/service"
import type { NotificationProvider, NotificationSendResult, PushSubscriptionPayload } from "@/lib/notifications/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

describe("Habit Notifications Unit & Security Tests", () => {
  const rootDir = process.cwd()

  // =========================================================================
  // 1. VALIDATION TESTS
  // =========================================================================
  describe("1. Habit Reminder Time Validation", () => {
    it("accepts valid 24-hour HH:mm time formats", () => {
      expect(reminderTimeSchema.parse("00:00")).toBe("00:00")
      expect(reminderTimeSchema.parse("08:30")).toBe("08:30")
      expect(reminderTimeSchema.parse("12:00")).toBe("12:00")
      expect(reminderTimeSchema.parse("23:59")).toBe("23:59")
    })

    it("accepts null or undefined and transforms empty string to null", () => {
      expect(reminderTimeSchema.parse(null)).toBe(null)
      expect(reminderTimeSchema.parse(undefined)).toBe(undefined)
      expect(reminderTimeSchema.parse("")).toBe(null)
      expect(reminderTimeSchema.parse("   ")).toBe(null)
    })

    it("rejects invalid time formats", () => {
      expect(() => reminderTimeSchema.parse("8:00")).toThrow() // missing leading zero
      expect(() => reminderTimeSchema.parse("24:00")).toThrow() // hour out of range
      expect(() => reminderTimeSchema.parse("12:60")).toThrow() // minute out of range
      expect(() => reminderTimeSchema.parse("morning")).toThrow() // arbitrary string
      expect(() => reminderTimeSchema.parse("08:30 PM")).toThrow() // 12-hour not allowed
    })

    it("accepts reminder_time in createHabitSchema", () => {
      const validHabit = {
        name: "Morning Meditation",
        frequency_type: "daily" as const,
        reminder_time: "07:30",
      }
      const parsed = createHabitSchema.parse(validHabit)
      expect(parsed.reminder_time).toBe("07:30")
    })

    it("accepts null reminder_time in updateHabitSchema", () => {
      const updateData = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Morning Meditation",
        frequency_type: "daily" as const,
        reminder_time: null,
      }
      const parsed = updateHabitSchema.parse(updateData)
      expect(parsed.reminder_time).toBe(null)
    })
  })

  // =========================================================================
  // 2. NOTIFICATION SERVICE DISPATCH TESTS
  // =========================================================================
  describe("2. NotificationService Habit Push Dispatch", () => {
    let mockProvider: NotificationProvider
    let service: NotificationService
    let mockSupabase: SupabaseClient<Database>
    const capturedPayloads: unknown[] = []

    beforeEach(() => {
      capturedPayloads.length = 0
      mockProvider = {
        send: vi.fn(async (_sub: PushSubscriptionPayload, payload) => {
          capturedPayloads.push(payload)
          const result: NotificationSendResult = {
            endpoint: "https://push.example.com/test-endpoint",
            status: "sent",
            statusCode: 201,
          }
          return result
        }),
      }

      service = new NotificationService(mockProvider)

      mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "push_subscriptions") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() =>
                  Promise.resolve({
                    data: [
                      {
                        endpoint: "https://push.example.com/test-endpoint",
                        p256dh: "key-p256dh-12345",
                        auth: "key-auth-12345",
                      },
                    ],
                    error: null,
                  })
                ),
              })),
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>
    })

    it("sends individual habit reminder push with correct title, url and tag", async () => {
      const result = await service.sendHabitReminderPush(mockSupabase, "user-test-id", {
        habitId: "habit-123",
        habitName: "Workout",
        description: "Hit the gym for 45 minutes",
      })

      expect(result.success).toBe(true)
      expect(result.sentCount).toBe(1)
      expect(mockProvider.send).toHaveBeenCalledTimes(1)

      const payload = capturedPayloads[0] as {
        title: string
        body: string
        url: string
        tag: string
        data: Record<string, unknown>
      }

      expect(payload.title).toBe("Habit Reminder: Workout")
      expect(payload.body).toBe("Hit the gym for 45 minutes")
      expect(payload.url).toBe("/habits")
      expect(payload.tag).toBe("habit-habit-123")
      expect(payload.data?.type).toBe("habit")
      expect(payload.data?.habitId).toBe("habit-123")
    })

    it("sends morning smart kickoff digest with list of habits", async () => {
      const result = await service.sendHabitDailyDigestPush(mockSupabase, "user-test-id", {
        type: "morning",
        habitNames: ["Read Book", "Drink Water", "Exercise", "Journal"],
      })

      expect(result.success).toBe(true)
      expect(result.sentCount).toBe(1)

      const payload = capturedPayloads[0] as {
        title: string
        body: string
        url: string
        tag: string
      }

      expect(payload.title).toContain("Morning Habit Kickoff")
      expect(payload.body).toContain("Read Book, Drink Water, Exercise +1 more")
      expect(payload.url).toBe("/today")
      expect(payload.tag).toBe("habit-morning-kickoff")
    })

    it("sends evening streak saver digest with remaining habits", async () => {
      const result = await service.sendHabitDailyDigestPush(mockSupabase, "user-test-id", {
        type: "evening",
        habitNames: ["Journal"],
      })

      expect(result.success).toBe(true)
      expect(result.sentCount).toBe(1)

      const payload = capturedPayloads[0] as {
        title: string
        body: string
        url: string
        tag: string
      }

      expect(payload.title).toContain("Protect Your Streak")
      expect(payload.body).toContain("1 habit remaining: Journal")
      expect(payload.url).toBe("/today")
      expect(payload.tag).toBe("habit-evening-saver")
    })
  })

  // =========================================================================
  // 3. SCHEMA MIGRATION VALIDATION
  // =========================================================================
  describe("3. Schema Migration Verification", () => {
    it("ensures migration 20261004000002_habit_reminders.sql exists and alters habits and profiles", () => {
      const migrationFile = path.join(
        rootDir,
        "supabase/migrations/20261004000002_habit_reminders.sql"
      )
      expect(fs.existsSync(migrationFile)).toBe(true)

      const content = fs.readFileSync(migrationFile, "utf-8")
      expect(content).toContain("ALTER TABLE public.habits")
      expect(content).toContain("ADD COLUMN IF NOT EXISTS reminder_time TEXT")
      expect(content).toContain("chk_habits_reminder_time")
      expect(content).toContain("ALTER TABLE public.profiles")
      expect(content).toContain("ADD COLUMN IF NOT EXISTS habit_notifications_enabled")
      expect(content).toContain("ADD COLUMN IF NOT EXISTS habit_morning_time")
      expect(content).toContain("ADD COLUMN IF NOT EXISTS habit_evening_time")
    })
  })
})
