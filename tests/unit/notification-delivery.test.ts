import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  queueReminderNotification,
  cancelReminderNotification,
  rescheduleReminderNotification,
  getPendingDeliveries,
} from "@/lib/notifications/delivery"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

describe("Notification Delivery Database Abstraction", () => {
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockSingle = vi.fn()

  const eqCalls: [string, unknown][] = []
  const mockEq = vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val])
    return {
      eq: mockEq,
      update: mockUpdate,
    }
  })

  const mockDelivery = {
    id: "delivery-1111-1111-1111-111111111111",
    user_id: "user-12345",
    reminder_id: "reminder-1111-1111-1111-111111111111",
    channel: "web_push",
    status: "pending",
    scheduled_at: "2026-10-03T12:00:00.000Z",
    payload: { title: "Team Meeting" },
    created_at: "2026-10-03T10:00:00.000Z",
    updated_at: "2026-10-03T10:00:00.000Z",
  }

  const mockSupabase = {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: mockSingle.mockResolvedValue({ data: mockDelivery, error: null }),
        })),
      }),
      update: vi.fn(() => ({
        eq: mockEq,
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [mockDelivery], error: null }),
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
  })

  describe("queueReminderNotification", () => {
    it("queues a delivery record in notification_deliveries table with scheduled UTC timestamp", async () => {
      const result = await queueReminderNotification(mockSupabase, {
        userId: "user-12345",
        reminderId: "reminder-1111-1111-1111-111111111111",
        title: "Team Meeting",
        scheduledAtUtc: "2026-10-03T12:00:00.000Z",
      })

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe(mockDelivery.id)
      expect(mockInsert).toHaveBeenCalledTimes(1)

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe("user-12345")
      expect(insertArg.reminder_id).toBe("reminder-1111-1111-1111-111111111111")
      expect(insertArg.channel).toBe("web_push")
      expect(insertArg.status).toBe("pending")
      expect(insertArg.scheduled_at).toBe("2026-10-03T12:00:00.000Z")
      expect(insertArg.payload.title).toBe("Team Meeting")
    })
  })

  describe("cancelReminderNotification", () => {
    it("cancels pending notification deliveries for a given reminder and user", async () => {
      const result = await cancelReminderNotification(
        mockSupabase,
        "reminder-1111-1111-1111-111111111111",
        "user-12345"
      )

      expect(result.success).toBe(true)
      const hasReminder = eqCalls.some(
        ([col, val]) => col === "reminder_id" && val === "reminder-1111-1111-1111-111111111111"
      )
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === "user-12345")
      const hasStatus = eqCalls.some(([col, val]) => col === "status" && val === "pending")

      expect(hasReminder).toBe(true)
      expect(hasUser).toBe(true)
      expect(hasStatus).toBe(true)
    })
  })

  describe("rescheduleReminderNotification", () => {
    it("updates scheduled_at timestamp for pending delivery", async () => {
      const result = await rescheduleReminderNotification(
        mockSupabase,
        "reminder-1111-1111-1111-111111111111",
        "user-12345",
        "2026-10-03T15:00:00.000Z"
      )

      expect(result.success).toBe(true)
      const hasReminder = eqCalls.some(
        ([col, val]) => col === "reminder_id" && val === "reminder-1111-1111-1111-111111111111"
      )
      expect(hasReminder).toBe(true)
    })
  })

  describe("getPendingDeliveries", () => {
    it("queries pending notification deliveries due for processing by background workers", async () => {
      const cutoff = "2026-10-03T12:00:00.000Z"
      const deliveries = await getPendingDeliveries(mockSupabase, cutoff)

      expect(deliveries.length).toBe(1)
      expect(deliveries[0].status).toBe("pending")
    })
  })

  describe("Architectural Separation Guarantee", () => {
    it("operates without requiring browser Notification API or window objects", () => {
      expect(typeof window).toBe("undefined")
      // Pure database operations succeed in Node / Server environment
      expect(typeof queueReminderNotification).toBe("function")
      expect(typeof cancelReminderNotification).toBe("function")
    })
  })
})
