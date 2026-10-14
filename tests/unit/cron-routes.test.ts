import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { GET as habitCronGet, POST as habitCronPost } from "@/app/api/cron/habit-reminders/route"
import { GET as reminderCronGet, POST as reminderCronPost } from "@/app/api/cron/reminder-dispatch/route"
import { notificationService } from "@/lib/notifications/service"
import * as adminModule from "@/lib/supabase/admin"

describe("Cron Routes Security & Dispatch Unit Tests", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("1. Habit Reminders Cron Authentication", () => {
    it("rejects unauthorized requests when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "super-secret-token"

      const req = new Request("http://localhost:3000/api/cron/habit-reminders", {
        method: "GET",
        headers: {
          authorization: "Bearer wrong-token",
        },
      })

      const res = await habitCronGet(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("accepts valid Bearer token matching CRON_SECRET", async () => {
      process.env.CRON_SECRET = "super-secret-token"

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }
      vi.spyOn(adminModule, "createAdminClient").mockReturnValue(
        mockSupabase as unknown as SupabaseClient<Database>
      )

      const req = new Request("http://localhost:3000/api/cron/habit-reminders", {
        method: "GET",
        headers: {
          authorization: "Bearer super-secret-token",
        },
      })

      const res = await habitCronGet(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it("accepts valid x-cron-secret header matching CRON_SECRET", async () => {
      process.env.CRON_SECRET = "super-secret-token"

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }
      vi.spyOn(adminModule, "createAdminClient").mockReturnValue(
        mockSupabase as unknown as SupabaseClient<Database>
      )

      const req = new Request("http://localhost:3000/api/cron/habit-reminders", {
        method: "POST",
        headers: {
          "x-cron-secret": "super-secret-token",
        },
      })

      const res = await habitCronPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe("2. Reminder Dispatch Cron Route", () => {
    it("rejects unauthorized requests when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "super-secret-token"

      const req = new Request("http://localhost:3000/api/cron/reminder-dispatch", {
        method: "GET",
      })

      const res = await reminderCronGet(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("returns empty success when no pending deliveries are due", async () => {
      delete process.env.CRON_SECRET

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        })),
      }
      vi.spyOn(adminModule, "createAdminClient").mockReturnValue(
        mockSupabase as unknown as SupabaseClient<Database>
      )

      const req = new Request("http://localhost:3000/api/cron/reminder-dispatch", {
        method: "GET",
      })

      const res = await reminderCronGet(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.dispatched).toBe(0)
    })

    it("dispatches due deliveries and updates their status to delivered", async () => {
      delete process.env.CRON_SECRET

      const mockDeliveries = [
        {
          id: "delivery-1",
          user_id: "user-1",
          reminder_id: "rem-1",
          status: "pending",
          scheduled_at: "2026-10-12T00:00:00.000Z",
          payload: { title: "Dentist Appointment", body: "Don't forget!" },
        },
      ]

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }))

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "notification_deliveries") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => Promise.resolve({ data: mockDeliveries, error: null })),
                    })),
                  })),
                })),
              })),
              update: mockUpdate,
            }
          }
          return {}
        }),
      }
      vi.spyOn(adminModule, "createAdminClient").mockReturnValue(
        mockSupabase as unknown as SupabaseClient<Database>
      )

      vi.spyOn(notificationService, "sendReminderPush").mockResolvedValue({
        success: true,
        sentCount: 1,
        totalSubscriptions: 1,
        expiredCount: 0,
        failedCount: 0,
        results: [],
      })

      const req = new Request("http://localhost:3000/api/cron/reminder-dispatch", {
        method: "POST",
      })

      const res = await reminderCronPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.dispatched).toBe(1)
      expect(data.failed).toBe(0)
      expect(notificationService.sendReminderPush).toHaveBeenCalledWith(
        mockSupabase,
        "user-1",
        expect.objectContaining({
          reminderId: "rem-1",
          title: "Dentist Appointment",
          body: "Don't forget!",
        })
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "delivered",
        })
      )
    })
  })
})
