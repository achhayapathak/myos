import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Task } from "@/types/database"

// Supabase mock spies
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockRevalidatePath = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
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

const mockTask: Task = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-12345",
  title: "Test Task",
  description: "Detailed description",
  priority: "high",
  status: "todo",
  due_at: "2026-10-01T12:00:00.000Z",
  completed_at: null,
  created_at: "2026-09-30T10:00:00.000Z",
  updated_at: "2026-09-30T10:00:00.000Z",
}

describe("Task Server Actions Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Setup insert chain: .insert().select().single()
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle.mockResolvedValue({ data: mockTask, error: null }),
      }),
    })

    // Setup update chain: .update().eq().eq().select().single()
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          }),
        }),
      }),
    })

    // Setup delete chain: .delete().eq().eq()
    mockDelete.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
  })

  describe("createTask", () => {
    it("creates a new task with user identity and valid payload", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")

      const res = await createTask({
        title: "Build tasks feature",
        description: "Add filtering and keyboard shortcuts",
        priority: "high",
        status: "todo",
        due_at: "2026-10-01T12:00:00.000Z",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          title: "Build tasks feature",
          description: "Add filtering and keyboard shortcuts",
          priority: "high",
          status: "todo",
          due_at: "2026-10-01T12:00:00.000Z",
          completed_at: null,
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("sets completed_at timestamp if created with status='completed'", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")

      const res = await createTask({
        title: "Already completed task",
        status: "completed",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          status: "completed",
          completed_at: expect.any(String),
        })
      )
    })

    it("fails when title is empty or invalid without executing database insert", async () => {
      const { createTask } = await import("@/app/(app)/tasks/actions")

      const res = await createTask({
        title: "   ",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Task title cannot be empty.")
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe("updateTask", () => {
    it("updates task fields and enforces user ownership", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")

      const res = await updateTask({
        id: "00000000-0000-0000-0000-000000000001",
        title: "Updated Title",
        priority: "medium",
      })

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
          priority: "medium",
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks")
    })

    it("sets completed_at when status transitions to completed", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")

      const res = await updateTask({
        id: "00000000-0000-0000-0000-000000000001",
        status: "completed",
      })

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      )
    })

    it("clears completed_at when status transitions back to in_progress or todo", async () => {
      const { updateTask } = await import("@/app/(app)/tasks/actions")

      const res = await updateTask({
        id: "00000000-0000-0000-0000-000000000001",
        status: "in_progress",
      })

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in_progress",
          completed_at: null,
        })
      )
    })
  })

  describe("deleteTask", () => {
    it("deletes a task ensuring user_id constraint", async () => {
      const { deleteTask } = await import("@/app/(app)/tasks/actions")

      const res = await deleteTask("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks")
    })

    it("rejects empty task ID without calling database", async () => {
      const { deleteTask } = await import("@/app/(app)/tasks/actions")

      const res = await deleteTask("")

      expect(res.success).toBe(false)
      expect(res.error).toBe("Task ID is required.")
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe("completeTask & reopenTask", () => {
    it("completeTask updates status to completed and sets completed_at", async () => {
      const { completeTask } = await import("@/app/(app)/tasks/actions")

      const res = await completeTask("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      )
    })

    it("reopenTask updates status to todo and clears completed_at", async () => {
      const { reopenTask } = await import("@/app/(app)/tasks/actions")

      const res = await reopenTask("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "todo",
          completed_at: null,
        })
      )
    })
  })

  describe("updateTaskStatus & toggleTaskStatus", () => {
    it("updateTaskStatus accepts valid status and applies change", async () => {
      const { updateTaskStatus } = await import("@/app/(app)/tasks/actions")

      const res = await updateTaskStatus(
        "00000000-0000-0000-0000-000000000001",
        "cancelled"
      )

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          completed_at: null,
        })
      )
    })

    it("toggleTaskStatus switches completed to todo", async () => {
      const { toggleTaskStatus } = await import("@/app/(app)/tasks/actions")

      const res = await toggleTaskStatus(
        "00000000-0000-0000-0000-000000000001",
        "completed"
      )

      expect(res.success).toBe(true)
      expect(res.data?.nextStatus).toBe("todo")
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "todo",
          completed_at: null,
        })
      )
    })

    it("toggleTaskStatus switches todo to completed", async () => {
      const { toggleTaskStatus } = await import("@/app/(app)/tasks/actions")

      const res = await toggleTaskStatus(
        "00000000-0000-0000-0000-000000000001",
        "todo"
      )

      expect(res.success).toBe(true)
      expect(res.data?.nextStatus).toBe("completed")
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      )
    })
  })
})
