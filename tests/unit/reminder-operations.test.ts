import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { Reminder } from "@/types/database"

// Supabase mock spies
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockRevalidatePath = vi.fn()

const eqCalls: [string, unknown][] = []
const mockEq = vi.fn((column: string, value: unknown) => {
  eqCalls.push([column, value])
  return {
    eq: mockEq,
    select: vi.fn(() => ({
      single: mockSingle.mockResolvedValue({ data: mockReminder, error: null }),
    })),
  }
})

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn((tableName: string) => {
    if (tableName === "notification_deliveries") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: "delivery-1" }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn((c1: string, v1: unknown) => {
            eqCalls.push([`notif_${c1}`, v1])
            return {
              eq: vi.fn((c2: string, v2: unknown) => {
                eqCalls.push([`notif_${c2}`, v2])
                return {
                  eq: vi.fn((c3: string, v3: unknown) => {
                    eqCalls.push([`notif_${c3}`, v3])
                    return Promise.resolve({ error: null, count: 1 })
                  }),
                }
              }),
            }
          }),
        })),
      }
    }

    return {
      insert: mockInsert,
      update: vi.fn(() => ({
        eq: mockEq,
      })),
      delete: vi.fn((options?: { count?: string }) => {
        if (options?.count === "exact") {
          return {
            eq: vi.fn((c1: string, v1: unknown) => {
              eqCalls.push([c1, v1])
              return {
                eq: vi.fn((c2: string, v2: unknown) => {
                  eqCalls.push([c2, v2])
                  return Promise.resolve({ error: null, count: 1 })
                }),
              }
            }),
          }
        }
        return { eq: mockEq }
      }),
      select: mockSelect,
    }
  }),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

const mockUser = {
  id: "user-12345",
  email: "owner@myos.local",
}

const mockReminder: Reminder = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  user_id: "user-12345",
  title: "Submit tax documents",
  remind_at: "2026-10-03T09:30:00.000Z",
  completed: false,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
}

import {
  createReminder,
  updateReminder,
  toggleReminderCompleted,
  deleteReminder,
} from "@/app/(app)/reminders/actions"

describe("Reminders Server Actions & Authorization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: mockSingle.mockResolvedValue({ data: mockReminder, error: null }),
      })),
    })
  })

  describe("1. createReminder", () => {
    it("creates a reminder storing timestamps in UTC and strictly using authenticated session user_id", async () => {
      const result = await createReminder({
        title: "Call dentist",
        scheduledDate: "2026-10-03",
        scheduledTime: "15:00",
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledTimes(1)

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe("user-12345") // Session identity
      expect(insertArg.title).toBe("Call dentist")
      expect(insertArg.completed).toBe(false)
      // 15:00 IST is 09:30 UTC
      expect(insertArg.remind_at).toBe("2026-10-03T09:30:00.000Z")

      expect(mockRevalidatePath).toHaveBeenCalledWith("/reminders")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("rejects reminder creation when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await createReminder({
        title: "Test Reminder",
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("rejects reminder creation with empty title", async () => {
      const result = await createReminder({
        title: "   ",
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      expect(result.success).toBe(false)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("ignores any client-supplied user_id in payload to prevent privilege escalation", async () => {
      const result = await createReminder({
        title: "Sneaky Reminder",
        user_id: "attacker-user-99999", // Spoof attempt
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      expect(result.success).toBe(true)
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe("user-12345") // Strictly authenticated user
    })
  })

  describe("2. updateReminder", () => {
    it("updates a reminder scoped strictly to id AND auth.uid()", async () => {
      const result = await updateReminder(mockReminder.id, {
        title: "Updated Dentist Call",
        scheduledDate: "2026-10-04",
        scheduledTime: "11:00",
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(true)
      const hasId = eqCalls.some(([col, val]) => col === "id" && val === mockReminder.id)
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === mockUser.id)

      expect(hasId).toBe(true)
      expect(hasUser).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/reminders")
    })

    it("rejects update when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await updateReminder(mockReminder.id, {
        title: "Updated",
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("rejects invalid reminder UUID format", async () => {
      const result = await updateReminder("not-a-uuid", {
        title: "Updated",
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Invalid reminder ID")
    })
  })

  describe("3. toggleReminderCompleted", () => {
    it("toggles completion status scoped strictly to id AND auth.uid()", async () => {
      const result = await toggleReminderCompleted(mockReminder.id, true)

      expect(result.success).toBe(true)
      const hasId = eqCalls.some(([col, val]) => col === "id" && val === mockReminder.id)
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === mockUser.id)

      expect(hasId).toBe(true)
      expect(hasUser).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/reminders")
    })

    it("rejects toggle when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await toggleReminderCompleted(mockReminder.id, true)
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })
  })

  describe("4. deleteReminder", () => {
    it("deletes a reminder scoped strictly to id AND auth.uid()", async () => {
      const result = await deleteReminder(mockReminder.id)

      expect(result.success).toBe(true)
      const hasId = eqCalls.some(([col, val]) => col === "id" && val === mockReminder.id)
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === mockUser.id)

      expect(hasId).toBe(true)
      expect(hasUser).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/reminders")
    })

    it("rejects delete when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await deleteReminder(mockReminder.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })
  })

  describe("5. Cross-User Isolation & Schema Verification", () => {
    it("ensures public.reminders has RLS enabled and proper security policies in PostgreSQL schema", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20260929000000_initial_schema.sql"
      )
      const migrationSql = fs.readFileSync(migrationPath, "utf-8")

      expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.reminders")
      expect(migrationSql).toContain("ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;")
      expect(migrationSql).toContain('CREATE POLICY "reminders_select_own"')
      expect(migrationSql).toContain('CREATE POLICY "reminders_insert_own"')
      expect(migrationSql).toContain('CREATE POLICY "reminders_update_own"')
      expect(migrationSql).toContain('CREATE POLICY "reminders_delete_own"')
      expect(migrationSql).toContain("(auth.uid() = user_id)")
    })

    it("ensures public.notification_deliveries has RLS enabled in migration", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20261003000000_notification_deliveries.sql"
      )
      const migrationSql = fs.readFileSync(migrationPath, "utf-8")

      expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.notification_deliveries")
      expect(migrationSql).toContain("ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;")
      expect(migrationSql).toContain('CREATE POLICY "notification_deliveries_select_own"')
      expect(migrationSql).toContain('CREATE POLICY "notification_deliveries_insert_own"')
      expect(migrationSql).toContain('CREATE POLICY "notification_deliveries_update_own"')
      expect(migrationSql).toContain('CREATE POLICY "notification_deliveries_delete_own"')
    })

    it("enforces that User B cannot delete or update User A's reminders", async () => {
      // User B is logged in
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-b", email: "user_b@myos.local" } },
        error: null,
      })

      // Try updating User A's reminder
      await updateReminder(mockReminder.id, {
        title: "Tampered by User B",
        scheduledDate: "2026-10-03",
        scheduledTime: "10:00",
      })

      // Query MUST be scoped to user_id = user-b
      const userCondition = eqCalls.find(([col]) => col === "user_id")
      expect(userCondition?.[1]).toBe("user-b")
    })
  })
})
