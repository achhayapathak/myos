import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { Event as DbEvent } from "@/types/database"

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
      single: mockSingle.mockResolvedValue({ data: mockEvent, error: null }),
    })),
  }
})

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
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
  })),
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

const mockEvent: DbEvent = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  user_id: "user-12345",
  title: "Engineering Architecture Review",
  description: "Review calendar implementation and RLS policies",
  start_at: "2026-10-03T09:00:00.000Z",
  end_at: "2026-10-03T10:00:00.000Z",
  all_day: false,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
}

import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/app/(app)/calendar/actions"

describe("Calendar Server Actions & Authorization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: mockSingle.mockResolvedValue({ data: mockEvent, error: null }),
      })),
    })
  })

  describe("1. createCalendarEvent", () => {
    it("creates an event storing timestamps in UTC and strictly using authenticated session user_id", async () => {
      const result = await createCalendarEvent({
        title: "Sprint Standup",
        description: "Daily meeting",
        all_day: false,
        startDate: "2026-10-03",
        startTime: "14:30",
        endDate: "2026-10-03",
        endTime: "15:00",
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledTimes(1)

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe("user-12345") // Session identity
      expect(insertArg.title).toBe("Sprint Standup")
      expect(insertArg.description).toBe("Daily meeting")
      expect(insertArg.all_day).toBe(false)
      // 14:30 IST is 09:00 UTC
      expect(insertArg.start_at).toBe("2026-10-03T09:00:00.000Z")
      // 15:00 IST is 09:30 UTC
      expect(insertArg.end_at).toBe("2026-10-03T09:30:00.000Z")

      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("rejects event creation when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await createCalendarEvent({
        title: "Test Event",
        startDate: "2026-10-03",
        startTime: "10:00",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("rejects event creation with empty or blank title", async () => {
      const result = await createCalendarEvent({
        title: "   ",
        startDate: "2026-10-03",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("rejects event when end time is before start time", async () => {
      const result = await createCalendarEvent({
        title: "Bad Event",
        startDate: "2026-10-03",
        startTime: "15:00",
        endDate: "2026-10-03",
        endTime: "14:00", // Before start time
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("End time must be after or equal to start time")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("creates an all-day event computing start and end bounds in UTC", async () => {
      const result = await createCalendarEvent({
        title: "All Day Conference",
        all_day: true,
        startDate: "2026-10-03",
        endDate: "2026-10-03",
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(true)
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.all_day).toBe(true)
      expect(insertArg.start_at).toBe("2026-10-02T18:30:00.000Z")
      expect(insertArg.end_at).toBe("2026-10-03T18:29:59.999Z")
    })

    it("ignores any client-supplied user_id in payload to prevent privilege escalation", async () => {
      const result = await createCalendarEvent({
        title: "Sneaky Event",
        user_id: "attacker-user-99999", // Malicious spoof
        startDate: "2026-10-03",
        startTime: "10:00",
      })

      expect(result.success).toBe(true)
      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe("user-12345") // Still the authenticated user
    })
  })

  describe("2. updateCalendarEvent", () => {
    it("updates an event scoped strictly to id AND auth.uid()", async () => {
      const result = await updateCalendarEvent(mockEvent.id, {
        title: "Updated Review",
        description: "Updated notes",
        startDate: "2026-10-03",
        startTime: "11:00",
        endDate: "2026-10-03",
        endTime: "12:00",
        timeZone: "Asia/Kolkata",
      })

      expect(result.success).toBe(true)
      // Check eq calls: must include ("id", mockEvent.id) and ("user_id", mockUser.id)
      const hasId = eqCalls.some(([col, val]) => col === "id" && val === mockEvent.id)
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === mockUser.id)

      expect(hasId).toBe(true)
      expect(hasUser).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
    })

    it("rejects update when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await updateCalendarEvent(mockEvent.id, {
        title: "Updated",
        startDate: "2026-10-03",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("rejects invalid event UUID format", async () => {
      const result = await updateCalendarEvent("not-a-uuid", {
        title: "Updated",
        startDate: "2026-10-03",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Invalid event ID")
    })
  })

  describe("3. deleteCalendarEvent", () => {
    it("deletes an event scoped strictly to id AND auth.uid()", async () => {
      const result = await deleteCalendarEvent(mockEvent.id)

      expect(result.success).toBe(true)
      const hasId = eqCalls.some(([col, val]) => col === "id" && val === mockEvent.id)
      const hasUser = eqCalls.some(([col, val]) => col === "user_id" && val === mockUser.id)

      expect(hasId).toBe(true)
      expect(hasUser).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
    })

    it("rejects delete when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await deleteCalendarEvent(mockEvent.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })
  })

  describe("4. Cross-User Isolation & RLS Schema Verification", () => {
    it("ensures public.events has RLS enabled and proper security policies in PostgreSQL schema", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20260929000000_initial_schema.sql"
      )
      const migrationSql = fs.readFileSync(migrationPath, "utf-8")

      // Verify table creation
      expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.events")

      // Verify user_id foreign key references auth.users(id) ON DELETE CASCADE
      expect(migrationSql).toContain(
        "user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE"
      )

      // Verify RLS is enabled
      expect(migrationSql).toContain("ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;")

      // Verify policies for SELECT, INSERT, UPDATE, DELETE
      expect(migrationSql).toContain('CREATE POLICY "events_select_own"')
      expect(migrationSql).toContain('CREATE POLICY "events_insert_own"')
      expect(migrationSql).toContain('CREATE POLICY "events_update_own"')
      expect(migrationSql).toContain('CREATE POLICY "events_delete_own"')

      // Verify auth.uid() = user_id checks
      expect(migrationSql).toContain("(auth.uid() = user_id)")

      // Verify check constraint on start_at <= end_at
      expect(migrationSql).toContain("chk_events_time_order CHECK (end_at IS NULL OR end_at >= start_at)")
    })

    it("enforces that User B cannot delete or update User A's events", async () => {
      // User B is logged in
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-b", email: "user_b@myos.local" } },
        error: null,
      })

      // Try updating User A's event
      await updateCalendarEvent(mockEvent.id, {
        title: "Tampered by User B",
        startDate: "2026-10-03",
        startTime: "10:00",
      })

      // The query MUST be scoped to user_id = user-b, never user-12345
      const userCondition = eqCalls.find(([col]) => col === "user_id")
      expect(userCondition?.[1]).toBe("user-b")
    })
  })
})
