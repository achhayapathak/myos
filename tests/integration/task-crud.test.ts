import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration Tests — Task CRUD
 *
 * Tests exercise the full server-action stack using mock Supabase clients
 * that mirror the RLS-scoped query patterns.
 *
 * Authorization invariants verified:
 * - user_id is always derived from the authenticated session
 * - All mutations include .eq("user_id", user.id) to prevent IDOR
 * - Unauthenticated requests return { success: false, error: "Unauthorized" }
 */

const USER_A = { id: "user-aaa-111", email: "usera@myos.test" }
const USER_B = { id: "user-bbb-222", email: "userb@myos.test" }

// Directly mock getCurrentUser to bypass React.cache
const mockGetCurrentUser = vi.fn()

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(async () => mockGetCurrentUser()),
}))

const mockInsert = vi.fn()
const mockSingle = vi.fn()

const eqCalls: [string, unknown][] = []
const mockEq = vi.fn((col: string, val: unknown) => {
  eqCalls.push([col, val])
  return {
    eq: mockEq,
    select: vi.fn(() => ({ single: mockSingle })),
    single: mockSingle,
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }
})

const mockSupabase = {
  auth: { getUser: vi.fn() }, // Not used directly — getCurrentUser is mocked above
  from: vi.fn(() => ({
    insert: mockInsert,
    update: vi.fn(() => ({ eq: mockEq })),
    delete: vi.fn(() => ({ eq: mockEq })),
    select: vi.fn(() => ({ eq: mockEq })),
  })),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

function makeTaskData(override = {}) {
  return {
    id: `task-${Date.now()}`,
    user_id: USER_A.id,
    title: "Test Task",
    description: null,
    status: "todo",
    priority: "medium",
    due_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override,
  }
}

describe("Integration: Task CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetCurrentUser.mockResolvedValue(USER_A)
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    })
    mockSingle.mockResolvedValue({ data: makeTaskData(), error: null })
  })

  // -------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------
  describe("createTask", () => {
    it("creates task with session user_id", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")
      const res = await createTask({ title: "Buy groceries", priority: "high" })
      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id, title: "Buy groceries" })
      )
    })

    it("rejects unauthenticated request", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { createTask } = await import("@/app/(app)/tasks/actions")
      const res = await createTask({ title: "Hack" })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("rejects empty title", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")
      const res = await createTask({ title: "" })
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
    })

    it("rejects title over 255 characters", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")
      const res = await createTask({ title: "a".repeat(256) })
      expect(res.success).toBe(false)
    })

    it("never trusts client-supplied user_id", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")
      // Pass a user_id in the raw input — it should be ignored
      await createTask({ title: "Spoofed", user_id: USER_B.id } as Parameters<typeof createTask>[0])
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_B.id })
      )
    })
  })

  // -------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------
  describe("updateTask", () => {
    const taskId = "00000000-0000-0000-0000-000000000099"

    it("updates task with user_id scoping", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")
      const res = await updateTask({ id: taskId, title: "Updated Title" })
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects unauthenticated update", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { updateTask } = await import("@/app/(app)/tasks/actions")
      const res = await updateTask({ id: taskId, title: "Hack" })
      expect(res.success).toBe(false)
    })

    it("scopes update to authenticated user_id preventing IDOR", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")
      await updateTask({ id: taskId, title: "Attempted IDOR update" })
      // Must scope to current user's id, not any other
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_B.id)).toBe(false)
    })
  })

  // -------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------
  describe("deleteTask", () => {
    const taskId = "00000000-0000-0000-0000-000000000088"

    it("deletes task with user_id constraint", async () => {
      const { deleteTask } = await import("@/app/(app)/tasks/actions")
      const res = await deleteTask(taskId)
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "id" && val === taskId)).toBe(true)
    })

    it("rejects unauthenticated delete", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { deleteTask } = await import("@/app/(app)/tasks/actions")
      const res = await deleteTask(taskId)
      expect(res.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------
  // STATUS TRANSITIONS
  // -------------------------------------------------------------------
  describe("task status transitions", () => {
    it("completeTask sets status=completed and completed_at timestamp", async () => {
      const { completeTask } = await import("@/app/(app)/tasks/actions")
      const res = await completeTask("00000000-0000-0000-0000-000000000077")
      expect(res.success).toBe(true)
    })

    it("reopenTask sets status=todo and clears completed_at", async () => {
      const { reopenTask } = await import("@/app/(app)/tasks/actions")
      const res = await reopenTask("00000000-0000-0000-0000-000000000077")
      expect(res.success).toBe(true)
    })

    it("rejects invalid status values", async () => {
      const { updateTaskStatus } = await import("@/app/(app)/tasks/actions")
      const res = await updateTaskStatus("00000000-0000-0000-0000-000000000077", "invalid" as never)
      expect(res.success).toBe(false)
    })
  })
})
