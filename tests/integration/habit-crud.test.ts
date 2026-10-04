import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration Tests — Habit & Habit Completion CRUD
 *
 * Verifies authorization, user_id scoping, validation, idempotency, and multi-user isolation.
 */

const USER_A = { id: "user-aaa-111", email: "usera@myos.test" }
const USER_B = { id: "user-bbb-222", email: "userb@myos.test" }

const mockGetCurrentUser = vi.fn()

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(async () => mockGetCurrentUser()),
}))

const mockInsert = vi.fn()
const mockUpsert = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const eqCalls: [string, unknown][] = []

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

function makeHabit(override = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333331",
    user_id: USER_A.id,
    name: "Morning Workout",
    description: "30 minutes strength training",
    frequency_type: "daily",
    target_days: null,
    color: null,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override,
  }
}

describe("Integration: Habit & Completion CRUD", () => {
  const testHabitId = "33333333-3333-4333-8333-333333333331"

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetCurrentUser.mockResolvedValue(USER_A)

    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    })
    mockSingle.mockResolvedValue({ data: makeHabit(), error: null })
    mockMaybeSingle.mockResolvedValue({ data: { id: testHabitId }, error: null })
    mockUpsert.mockResolvedValue({ error: null })

    mockSupabase.from = vi.fn(() => ({
      insert: mockInsert,
      upsert: mockUpsert,
      update: vi.fn(() => ({
        eq: vi.fn((col1, val1) => {
          eqCalls.push([col1, val1])
          return {
            eq: vi.fn((col2, val2) => {
              eqCalls.push([col2, val2])
              return {
                select: vi.fn(() => ({ single: mockSingle })),
              }
            }),
          }
        }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((col1, val1) => {
          eqCalls.push([col1, val1])
          return {
            eq: vi.fn((col2, val2) => {
              eqCalls.push([col2, val2])
              return {
                eq: vi.fn((col3, val3) => {
                  eqCalls.push([col3, val3])
                  return Promise.resolve({ error: null, count: 1 })
                }),
                then: (resolve: (v: { error: null; count: number }) => void) =>
                  resolve({ error: null, count: 1 }),
              }
            }),
          }
        }),
      })),
      select: vi.fn(() => ({
        eq: vi.fn((col1, val1) => {
          eqCalls.push([col1, val1])
          return {
            eq: vi.fn((col2, val2) => {
              eqCalls.push([col2, val2])
              return {
                maybeSingle: mockMaybeSingle,
              }
            }),
            maybeSingle: mockMaybeSingle,
          }
        }),
      })),
    }))
  })

  // =========================================================================
  // 1. CREATE HABIT
  // =========================================================================
  describe("createHabit", () => {
    it("creates a daily habit with session user_id", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      const res = await createHabit({
        name: "Morning Run",
        description: "5km",
        frequency_type: "daily",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_A.id,
          name: "Morning Run",
          frequency_type: "daily",
          target_days: null,
          archived: false,
        })
      )
    })

    it("creates a weekly habit with target days", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      const res = await createHabit({
        name: "Gym Workout",
        frequency_type: "weekly",
        target_days: [1, 3, 5],
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_A.id,
          name: "Gym Workout",
          frequency_type: "weekly",
          target_days: [1, 3, 5],
        })
      )
    })

    it("rejects weekly habit without target days", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      const res = await createHabit({
        name: "Gym",
        frequency_type: "weekly",
        target_days: [],
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/target day/i)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("rejects habit name longer than 100 characters", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      const res = await createHabit({
        name: "a".repeat(101),
        frequency_type: "daily",
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/100 characters/i)
    })

    it("never trusts client user_id override", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      await createHabit({
        name: "Untrusted",
        frequency_type: "daily",
        user_id: USER_B.id,
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_B.id })
      )
    })
  })

  // =========================================================================
  // 2. QUICK CREATE HABIT
  // =========================================================================
  describe("quickCreateHabit", () => {
    it("creates a daily habit with just a name", async () => {
      const { quickCreateHabit } = await import("@/app/(app)/habits/actions")
      const res = await quickCreateHabit({ name: "Read Book" })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_A.id,
          name: "Read Book",
          frequency_type: "daily",
          target_days: null,
          archived: false,
        })
      )
    })

    it("rejects quick create with empty name", async () => {
      const { quickCreateHabit } = await import("@/app/(app)/habits/actions")
      const res = await quickCreateHabit({ name: "   " })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/name is required/i)
    })
  })

  // =========================================================================
  // 3. UPDATE HABIT
  // =========================================================================
  describe("updateHabit", () => {
    it("scopes update to authenticated user_id", async () => {
      const { updateHabit } = await import("@/app/(app)/habits/actions")
      const res = await updateHabit(testHabitId, {
        name: "Updated Morning Workout",
        frequency_type: "daily",
      })

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", testHabitId])
      expect(eqCalls).toContainEqual(["user_id", USER_A.id])
    })

    it("rejects update with invalid habit ID format", async () => {
      const { updateHabit } = await import("@/app/(app)/habits/actions")
      const res = await updateHabit("not-a-uuid", {
        name: "Bad",
        frequency_type: "daily",
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/invalid habit id/i)
    })
  })

  // =========================================================================
  // 4. ARCHIVE & RESTORE HABIT
  // =========================================================================
  describe("archive and restore habit", () => {
    it("archives habit and scopes to authenticated user_id", async () => {
      const { toggleHabitArchive } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitArchive(testHabitId, true)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", testHabitId])
      expect(eqCalls).toContainEqual(["user_id", USER_A.id])
    })

    it("restores habit from archived state", async () => {
      const { toggleHabitArchive } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitArchive(testHabitId, false)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", testHabitId])
      expect(eqCalls).toContainEqual(["user_id", USER_A.id])
    })
  })

  // =========================================================================
  // 5. HABIT COMPLETION & IDEMPOTENCY
  // =========================================================================
  describe("toggleHabitCompletion", () => {
    it("creates completion record with habit ownership verification", async () => {
      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitCompletion(testHabitId, "2026-10-05", true)

      expect(res.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          habit_id: testHabitId,
          user_id: USER_A.id,
          completed_on: "2026-10-05",
        }),
        expect.objectContaining({
          onConflict: "habit_id,completed_on",
          ignoreDuplicates: true,
        })
      )
    })

    it("is idempotent on duplicate completion requests", async () => {
      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")

      // First completion call
      const res1 = await toggleHabitCompletion(testHabitId, "2026-10-05", true)
      expect(res1.success).toBe(true)

      // Second duplicate call on same date
      const res2 = await toggleHabitCompletion(testHabitId, "2026-10-05", true)
      expect(res2.success).toBe(true)

      // Both use onConflict ignoreDuplicates
      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })

    it("deletes completion record when undone", async () => {
      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitCompletion(testHabitId, "2026-10-05", false)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["habit_id", testHabitId])
      expect(eqCalls).toContainEqual(["completed_on", "2026-10-05"])
      expect(eqCalls).toContainEqual(["user_id", USER_A.id])
    })

    it("rejects completion for habit that does not belong to session user", async () => {
      // Habit lookup returns null (unauthorized or not found)
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitCompletion(testHabitId, "2026-10-05", true)

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized|not found/i)
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 6. DELETE HABIT
  // =========================================================================
  describe("deleteHabit", () => {
    it("deletes habit scoping strictly to user_id", async () => {
      const { deleteHabit } = await import("@/app/(app)/habits/actions")
      const res = await deleteHabit(testHabitId)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", testHabitId])
      expect(eqCalls).toContainEqual(["user_id", USER_A.id])
    })
  })
})
