import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { PomodoroSession } from "@/types/database"

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
    is: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn(() => ({
      single: mockSingle.mockResolvedValue({ data: mockSession, error: null }),
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
    delete: vi.fn(() => ({
      eq: mockEq,
    })),
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

const mockSession: PomodoroSession = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-12345",
  type: "focus",
  duration_seconds: 1500,
  started_at: "2026-09-30T10:00:00.000Z",
  ended_at: null,
  task_id: "123e4567-e89b-12d3-a456-426614174000",
  created_at: "2026-09-30T10:00:00.000Z",
  updated_at: "2026-09-30T10:00:00.000Z",
}

describe("Focus / Pomodoro Server Actions & Security Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle.mockResolvedValue({ data: mockSession, error: null }),
      }),
    })

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          }),
        }),
        not: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })
  })

  describe("1. startPomodoroSession", () => {
    it("starts a session storing started_at, duration_seconds, and ended_at as null", async () => {
      const { startPomodoroSession } = await import("@/app/(app)/focus/actions")

      const res = await startPomodoroSession({
        type: "focus",
        duration_seconds: 1500,
        task_id: "123e4567-e89b-12d3-a456-426614174000",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          type: "focus",
          duration_seconds: 1500,
          started_at: expect.any(String),
          ended_at: null,
          task_id: "123e4567-e89b-12d3-a456-426614174000",
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/focus")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("defaults to 25 minutes for focus type when duration is omitted", async () => {
      const { startPomodoroSession } = await import("@/app/(app)/focus/actions")

      const res = await startPomodoroSession({
        type: "focus",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_seconds: 1500,
        })
      )
    })

    it("defaults to 5 minutes for short_break type", async () => {
      const { startPomodoroSession } = await import("@/app/(app)/focus/actions")

      const res = await startPomodoroSession({
        type: "short_break",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_seconds: 300,
        })
      )
    })

    it("blocks unauthenticated users from starting sessions", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      })

      const { startPomodoroSession } = await import("@/app/(app)/focus/actions")

      const res = await startPomodoroSession({ type: "focus" })
      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe("2. completePomodoroSession", () => {
    it("persists ended_at timestamp and enforces user_id check", async () => {
      const { completePomodoroSession } = await import("@/app/(app)/focus/actions")

      const sessionId = "00000000-0000-0000-0000-000000000001"
      const res = await completePomodoroSession(sessionId)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", sessionId])
      expect(eqCalls).toContainEqual(["user_id", "user-12345"])
      expect(mockRevalidatePath).toHaveBeenCalledWith("/focus")
    })
  })

  describe("3. cancelPomodoroSession", () => {
    it("deletes session with user_id authorization", async () => {
      const { cancelPomodoroSession } = await import("@/app/(app)/focus/actions")

      const sessionId = "00000000-0000-0000-0000-000000000001"
      const res = await cancelPomodoroSession(sessionId)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", sessionId])
      expect(eqCalls).toContainEqual(["user_id", "user-12345"])
    })
  })

  describe("4. associateTaskWithSession", () => {
    it("links task to session with user_id ownership check", async () => {
      const { associateTaskWithSession } = await import("@/app/(app)/focus/actions")

      const sessionId = "00000000-0000-0000-0000-000000000001"
      const taskId = "123e4567-e89b-12d3-a456-426614174000"
      const res = await associateTaskWithSession(sessionId, taskId)

      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(["id", sessionId])
      expect(eqCalls).toContainEqual(["user_id", "user-12345"])
    })
  })

  describe("5. Multi-User Isolation & Anti-Cross-User Access", () => {
    it("prevents User A from completing User B's Pomodoro session", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { completePomodoroSession } = await import("@/app/(app)/focus/actions")

      const victimSessionId = "00000000-0000-0000-0000-000000000099"
      await completePomodoroSession(victimSessionId)

      expect(eqCalls).toContainEqual(["id", victimSessionId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("prevents User A from cancelling User B's Pomodoro session", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { cancelPomodoroSession } = await import("@/app/(app)/focus/actions")

      const victimSessionId = "00000000-0000-0000-0000-000000000099"
      await cancelPomodoroSession(victimSessionId)

      expect(eqCalls).toContainEqual(["id", victimSessionId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })
  })

  describe("6. Database Row Level Security (RLS) Policy Verification", () => {
    const migrationPath = path.join(
      rootDir,
      "supabase/migrations/20260929000000_initial_schema.sql"
    )
    const hardeningPath = path.join(
      rootDir,
      "supabase/migrations/20260929000001_security_hardening.sql"
    )

    const migrationContent = fs.readFileSync(migrationPath, "utf-8")
    const hardeningContent = fs.readFileSync(hardeningPath, "utf-8")

    it("verifies RLS is enabled on pomodoro_sessions table", () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+public\.pomodoro_sessions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("verifies pomodoro_sessions SELECT policy restricts access to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"pomodoro_sessions_select_own"\s+ON\s+public\.pomodoro_sessions\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies pomodoro_sessions INSERT policy checks auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"pomodoro_sessions_insert_own"\s+ON\s+public\.pomodoro_sessions\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies pomodoro_sessions UPDATE policy checks auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"pomodoro_sessions_update_own"\s+ON\s+public\.pomodoro_sessions\s+FOR\s+UPDATE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies pomodoro_sessions DELETE policy checks auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"pomodoro_sessions_delete_own"\s+ON\s+public\.pomodoro_sessions\s+FOR\s+DELETE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies user_id defaults to auth.uid() in security hardening migration", () => {
      expect(hardeningContent).toMatch(
        /ALTER\s+TABLE\s+public\.pomodoro_sessions\s+ALTER\s+COLUMN\s+user_id\s+SET\s+DEFAULT\s+auth\.uid\(\)/i
      )
    })
  })

  describe("7. Architectural Boundary Enforcement", () => {
    it("ensures lib/focus/data.ts imports 'server-only'", () => {
      const dataContent = fs.readFileSync(
        path.join(rootDir, "lib/focus/data.ts"),
        "utf-8"
      )
      expect(dataContent).toMatch(/^import\s+["']server-only["']/)
    })

    it("ensures app/(app)/focus/actions.ts declares 'use server'", () => {
      const actionsContent = fs.readFileSync(
        path.join(rootDir, "app/(app)/focus/actions.ts"),
        "utf-8"
      )
      expect(actionsContent).toMatch(/^["']use server["']/)
    })
  })
})
