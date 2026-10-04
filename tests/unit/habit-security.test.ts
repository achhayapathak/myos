import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"

// Mocks for Supabase server client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpsert = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()

const eqCalls: [string, unknown][] = []

const mockEq = vi.fn((col: string, val: unknown) => {
  eqCalls.push([col, val])
  return {
    eq: mockEq,
    select: vi.fn(() => ({
      single: mockSingle.mockResolvedValue({
        data: { id: "habit-1", user_id: "user-attacker" },
        error: null,
      }),
      maybeSingle: mockMaybeSingle,
    })),
    maybeSingle: mockMaybeSingle,
  }
})

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Habit Tracker Security & Multi-User Isolation Tests", () => {
  const rootDir = process.cwd()
  const validHabitId = "11111111-1111-4111-8111-111111111111"
  const victimHabitId = "22222222-2222-4222-8222-222222222222"

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0

    mockSupabase.from = vi.fn(() => ({
      insert: mockInsert,
      upsert: mockUpsert,
      update: vi.fn(() => ({ eq: mockEq })),
      delete: vi.fn(() => ({
        eq: vi.fn((col1, val1) => {
          eqCalls.push([col1, val1])
          return {
            eq: vi.fn((col2, val2) => {
              eqCalls.push([col2, val2])
              return Promise.resolve({ error: null, count: 1 })
            }),
          }
        }),
      })),
      select: vi.fn(() => ({
        eq: mockEq,
      })),
    }))
  })

  // =========================================================================
  // 1. UNAUTHENTICATED ACCESS
  // =========================================================================
  describe("1. Unauthenticated Request Blocking", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No active session"),
      })
    })

    it("blocks unauthenticated users from creating a habit", async () => {
      const { createHabit } = await import("@/app/(app)/habits/actions")
      const res = await createHabit({ name: "Run", frequency_type: "daily" })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from quick-creating a habit", async () => {
      const { quickCreateHabit } = await import("@/app/(app)/habits/actions")
      const res = await quickCreateHabit({ name: "Drink water" })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from updating a habit", async () => {
      const { updateHabit } = await import("@/app/(app)/habits/actions")
      const res = await updateHabit(validHabitId, {
        name: "Hacked habit",
        frequency_type: "daily",
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("blocks unauthenticated users from archiving a habit", async () => {
      const { toggleHabitArchive } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitArchive(validHabitId, true)

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("blocks unauthenticated users from deleting a habit", async () => {
      const { deleteHabit } = await import("@/app/(app)/habits/actions")
      const res = await deleteHabit(validHabitId)

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("blocks unauthenticated users from toggling habit completion", async () => {
      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")
      const res = await toggleHabitCompletion(
        validHabitId,
        "2026-10-05",
        true
      )

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it("returns null from getHabitsPageData when unauthenticated", async () => {
      const { getHabitsPageData } = await import("@/lib/habits/queries")
      const res = await getHabitsPageData()
      expect(res).toBeNull()
    })

    it("returns null from getTodayHabitsData when unauthenticated", async () => {
      const { getTodayHabitsData } = await import("@/lib/habits/queries")
      const res = await getTodayHabitsData()
      expect(res).toBeNull()
    })
  })

  // =========================================================================
  // 2. CLIENT USER_ID TAMPERING PREVENTION
  // =========================================================================
  describe("2. Client user_id Tampering Prevention", () => {
    it("never trusts client-supplied user_id during habit creation", async () => {
      // Authenticated as User A
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-A", email: "userA@myos.local" } },
        error: null,
      })

      mockInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "habit-new", user_id: "user-A" },
            error: null,
          }),
        }),
      })

      const { createHabit } = await import("@/app/(app)/habits/actions")

      // Malicious payload attempting to inject User B's ID
      const spoofedPayload = {
        name: "Spoofed Habit",
        frequency_type: "daily",
        user_id: "victim-user-B",
      }

      const res = await createHabit(spoofedPayload)

      expect(res.success).toBe(true)
      // Must insert with authenticated user-A, NOT victim-user-B
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-A",
          name: "Spoofed Habit",
        })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "victim-user-B",
        })
      )
    })
  })

  // =========================================================================
  // 3. CROSS-USER ACCESS & COMPLETION PREVENTION
  // =========================================================================
  describe("3. Multi-User Isolation & Anti-Cross-User Access", () => {
    it("strictly scopes update queries with user_id to prevent modifying other users' habits", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { updateHabit } = await import("@/app/(app)/habits/actions")

      await updateHabit(victimHabitId, {
        name: "Hijacked Habit",
        frequency_type: "daily",
      })

      // Must have verified id = victimHabitId AND user_id = user-attacker
      expect(eqCalls).toContainEqual(["id", victimHabitId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("strictly scopes delete queries with user_id to prevent deleting other users' habits", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { deleteHabit } = await import("@/app/(app)/habits/actions")

      await deleteHabit(victimHabitId)

      expect(eqCalls).toContainEqual(["id", victimHabitId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("prevents User A from creating a completion for User B's habit", async () => {
      // Authenticated as User A
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-A", email: "userA@myos.local" } },
        error: null,
      })

      // Defense-in-depth ownership lookup: habit query returns null because habit belongs to User B
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")

      const res = await toggleHabitCompletion(victimHabitId, "2026-10-05", true)

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/habit not found or unauthorized/i)
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it("prevents User A from deleting User B's completion", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-A", email: "userA@myos.local" } },
        error: null,
      })

      // Ownership lookup returns null
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const { toggleHabitCompletion } = await import("@/app/(app)/habits/actions")

      const res = await toggleHabitCompletion(victimHabitId, "2026-10-05", false)

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/habit not found or unauthorized/i)
    })
  })

  // =========================================================================
  // 4. DATABASE ROW LEVEL SECURITY (RLS) POLICIES VERIFICATION
  // =========================================================================
  describe("4. PostgreSQL Row Level Security (RLS) Policy Verification", () => {
    const migrationPath = path.join(
      rootDir,
      "supabase/migrations/20261004000000_habits.sql"
    )
    const migrationContent = fs.readFileSync(migrationPath, "utf-8")

    it("verifies RLS is enabled on habits table", () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+public\.habits\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("verifies habits SELECT policy restricts access strictly to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habits_select_own"\s+ON\s+public\.habits\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies habits INSERT policy enforces auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habits_insert_own"\s+ON\s+public\.habits\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies habits UPDATE policy prevents ownership modification (USING + WITH CHECK)", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habits_update_own"\s+ON\s+public\.habits\s+FOR\s+UPDATE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies habits DELETE policy restricts deletion to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habits_delete_own"\s+ON\s+public\.habits\s+FOR\s+DELETE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies RLS is enabled on habit_completions table", () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+public\.habit_completions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("verifies habit_completions INSERT policy ensures associated habit belongs to auth user", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habit_completions_insert_own"[\s\S]*?WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s+AND\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.habits/i
      )
    })

    it("verifies habit_completions DELETE policy ensures associated habit belongs to auth user", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"habit_completions_delete_own"[\s\S]*?USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s+AND\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.habits/i
      )
    })

    it("enforces unique constraint (habit_id, completed_on) on habit_completions", () => {
      expect(migrationContent).toMatch(
        /CONSTRAINT\s+uq_habit_completions_habit_date\s+UNIQUE\s*\(\s*habit_id,\s*completed_on\s*\)/i
      )
    })
  })

  // =========================================================================
  // 5. ARCHITECTURAL BOUNDARY ENFORCEMENT
  // =========================================================================
  describe("5. Architectural Boundary Enforcement", () => {
    it("ensures lib/habits/queries.ts imports 'server-only'", () => {
      const queriesContent = fs.readFileSync(
        path.join(rootDir, "lib/habits/queries.ts"),
        "utf-8"
      )
      expect(queriesContent).toMatch(/^import\s+["']server-only["']/)
    })

    it("ensures app/(app)/habits/actions.ts declares 'use server'", () => {
      const actionsContent = fs.readFileSync(
        path.join(rootDir, "app/(app)/habits/actions.ts"),
        "utf-8"
      )
      expect(actionsContent).toMatch(/^["']use server["']/)
    })
  })
})
