import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"

// Mocks for Supabase client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

// Spies to record `.eq()` calls to verify user_id filters
const eqCalls: [string, unknown][] = []
const mockEq = vi.fn((column: string, value: unknown) => {
  eqCalls.push([column, value])
  return {
    eq: mockEq,
    select: vi.fn(() => ({
      single: mockSingle.mockResolvedValue({ data: { id: "test" }, error: null }),
    })),
  }
})

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    update: vi.fn(() => ({ eq: mockEq })),
    delete: vi.fn(() => ({ eq: mockEq })),
    select: mockSelect,
  })),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Tasks Feature Security & Multi-User Isolation Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
  })

  describe("1. Unauthenticated Request Blocking", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No active session"),
      })
    })

    it("blocks unauthenticated users from creating tasks", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")
      const res = await createTask({ title: "Unauthorized task" })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from updating tasks", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")
      const res = await updateTask({
        id: "00000000-0000-0000-0000-000000000001",
        title: "Malicious update",
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from deleting tasks", async () => {
      const { deleteTask } = await import("@/app/(app)/tasks/actions")
      const res = await deleteTask("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from completing or reopening tasks", async () => {
      const { completeTask, reopenTask } = await import("@/app/(app)/tasks/actions")

      const resComplete = await completeTask("00000000-0000-0000-0000-000000000001")
      expect(resComplete.success).toBe(false)
      expect(resComplete.error).toContain("Unauthorized")

      const resReopen = await reopenTask("00000000-0000-0000-0000-000000000001")
      expect(resReopen.success).toBe(false)
      expect(resReopen.error).toContain("Unauthorized")
    })

    it("returns null from getTasksPageData when unauthenticated", async () => {
      const { getTasksPageData } = await import("@/lib/tasks/data")
      const res = await getTasksPageData()
      expect(res).toBeNull()
    })
  })

  describe("2. Client user_id Tampering Prevention", () => {
    it("never trusts client-supplied user_id during task creation", async () => {
      // Authenticated as User A
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-A", email: "userA@myos.local" } },
        error: null,
      })

      mockInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "task-new", user_id: "user-A" },
            error: null,
          }),
        }),
      })

      const { createTask } = await import("@/app/(app)/tasks/actions")

      // Malicious payload attempting to inject User B's ID
      const spoofedPayload = {
        title: "Malicious Injected Task",
        user_id: "victim-user-B",
      }

      const res = await createTask(spoofedPayload)

      expect(res.success).toBe(true)
      // Must insert with user-A, NOT victim-user-B
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-A",
          title: "Malicious Injected Task",
        })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "victim-user-B",
        })
      )
    })
  })

  describe("3. Multi-User Isolation & Anti-Cross-User Access", () => {
    it("strictly scopes update queries with user_id to prevent modifying other users' tasks", async () => {
      // Authenticated as Attacker (User A)
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { updateTask } = await import("@/app/(app)/tasks/actions")

      const victimTaskId = "00000000-0000-0000-0000-000000000099"
      await updateTask({
        id: victimTaskId,
        title: "Hijacked Title",
      })

      // Must have verified id = victimTaskId AND user_id = user-attacker
      expect(eqCalls).toContainEqual(["id", victimTaskId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("strictly scopes delete queries with user_id to prevent deleting other users' tasks", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { deleteTask } = await import("@/app/(app)/tasks/actions")

      const victimTaskId = "00000000-0000-0000-0000-000000000099"
      await deleteTask(victimTaskId)

      expect(eqCalls).toContainEqual(["id", victimTaskId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("strictly scopes complete and reopen queries with user_id", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { completeTask, reopenTask } = await import("@/app/(app)/tasks/actions")

      const victimTaskId = "00000000-0000-0000-0000-000000000099"

      await completeTask(victimTaskId)
      expect(eqCalls).toContainEqual(["id", victimTaskId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])

      eqCalls.length = 0

      await reopenTask(victimTaskId)
      expect(eqCalls).toContainEqual(["id", victimTaskId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })
  })

  describe("4. Database Row Level Security (RLS) Policy Verification", () => {
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

    it("verifies RLS is enabled on tasks table", () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+public\.tasks\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("verifies tasks SELECT policy restricts access strictly to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"tasks_select_own"\s+ON\s+public\.tasks\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies tasks INSERT policy verifies auth.uid() = user_id (never trusting client)", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"tasks_insert_own"\s+ON\s+public\.tasks\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies tasks UPDATE policy blocks transferring ownership across users (USING + WITH CHECK)", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"tasks_update_own"\s+ON\s+public\.tasks\s+FOR\s+UPDATE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies tasks DELETE policy restricts deletion to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"tasks_delete_own"\s+ON\s+public\.tasks\s+FOR\s+DELETE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies user_id on tasks defaults to auth.uid() in security hardening", () => {
      expect(hardeningContent).toMatch(
        /ALTER\s+TABLE\s+public\.tasks\s+ALTER\s+COLUMN\s+user_id\s+SET\s+DEFAULT\s+auth\.uid\(\)/i
      )
    })
  })

  describe("5. Architectural Boundary Enforcement", () => {
    it("ensures lib/tasks/data.ts imports 'server-only'", () => {
      const dataContent = fs.readFileSync(
        path.join(rootDir, "lib/tasks/data.ts"),
        "utf-8"
      )
      expect(dataContent).toMatch(/^import\s+["']server-only["']/)
    })

    it("ensures app/(app)/tasks/actions.ts declares 'use server'", () => {
      const actionsContent = fs.readFileSync(
        path.join(rootDir, "app/(app)/tasks/actions.ts"),
        "utf-8"
      )
      expect(actionsContent).toMatch(/^["']use server["']/)
    })
  })
})
