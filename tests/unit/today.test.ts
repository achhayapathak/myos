import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  getTodayDateBounds,
  formatEventTime,
  getTaskDueLabel,
} from "@/lib/today-utils"

// Mocks for Server Actions testing
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockMaybeSingle = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => {
    return {
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    }
  }),
}

// Chainable mock helpers
mockInsert.mockReturnValue({ error: null })
mockUpdate.mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
})
mockSelect.mockReturnValue({
  eq: vi.fn().mockReturnValue({
    maybeSingle: mockMaybeSingle,
  }),
})
mockMaybeSingle.mockResolvedValue({
  data: { timezone: "Asia/Kolkata", display_name: "Owner" },
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Today Dashboard Unit Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "test-user-id", email: "owner@myos.local" } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  describe("1. Architectural & Engineering Principle Enforcement", () => {
    it("ensures lib/today-data.ts contains import 'server-only'", () => {
      const filePath = path.join(rootDir, "lib/today-data.ts")
      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toMatch(/import\s+["']server-only["']/)
    })

    it("ensures app/(app)/today/actions.ts is a valid Server Action file", () => {
      const filePath = path.join(rootDir, "app/(app)/today/actions.ts")
      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toMatch(/^["']use server["']/)
    })

    it("verifies all reusable components exist under components/today", () => {
      const expectedComponents = [
        "today-header.tsx",
        "task-item.tsx",
        "tasks-due-today.tsx",
        "high-priority-tasks.tsx",
        "upcoming-events.tsx",
        "focus-status-card.tsx",
        "quick-task-form.tsx",
        "quick-note-form.tsx",
        "index.ts",
      ]

      for (const comp of expectedComponents) {
        const compPath = path.join(rootDir, "components/today", comp)
        expect(fs.existsSync(compPath)).toBe(true)
      }
    })
  })

  describe("2. Date Bounds & Timezone Calculations", () => {
    it("computes accurate start and end bounds in UTC for Asia/Kolkata", () => {
      const bounds = getTodayDateBounds("Asia/Kolkata")
      expect(bounds.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(bounds.formattedDate).toBeDefined()
      expect(bounds.timeZone).toBe("Asia/Kolkata")
      expect(new Date(bounds.startISO).getTime()).toBeLessThan(
        new Date(bounds.endISO).getTime()
      )
      // Exactly 24 hours minus 1 ms
      const diff =
        new Date(bounds.endISO).getTime() - new Date(bounds.startISO).getTime()
      expect(diff).toBe(24 * 60 * 60 * 1000 - 1)
    })

    it("computes accurate 24-hour bounds in UTC for America/New_York", () => {
      const bounds = getTodayDateBounds("America/New_York")
      const diff =
        new Date(bounds.endISO).getTime() - new Date(bounds.startISO).getTime()
      expect(diff).toBe(24 * 60 * 60 * 1000 - 1)
      expect(bounds.timeZone).toBe("America/New_York")
    })

    it("falls back to UTC on invalid timezone string without crashing", () => {
      const bounds = getTodayDateBounds("Invalid/NonExistent_Zone")
      expect(bounds.timeZone).toBe("UTC")
      expect(bounds.startISO).toBeDefined()
      expect(bounds.endISO).toBeDefined()
    })

    it("formats human-readable greetings accurately", () => {
      const bounds = getTodayDateBounds("Asia/Kolkata")
      expect(["Good morning", "Good afternoon", "Good evening", "Good night"]).toContain(
        bounds.greeting
      )
    })
  })

  describe("3. Event Time Formatting", () => {
    it("returns 'All Day' when allDay is true", () => {
      const formatted = formatEventTime(
        "2026-09-30T10:00:00Z",
        "2026-09-30T11:00:00Z",
        true
      )
      expect(formatted).toBe("All Day")
    })

    it("formats start and end times cleanly for standard events", () => {
      const formatted = formatEventTime(
        "2026-09-30T10:30:00Z",
        "2026-09-30T11:30:00Z",
        false,
        "UTC"
      )
      expect(formatted).toBe("10:30 AM – 11:30 AM")
    })

    it("formats start time only when endAt is null", () => {
      const formatted = formatEventTime(
        "2026-09-30T14:00:00Z",
        null,
        false,
        "UTC"
      )
      expect(formatted).toBe("2:00 PM")
    })
  })

  describe("4. Task Due Date Labels", () => {
    const startISO = "2026-09-30T00:00:00.000Z"
    const endISO = "2026-09-30T23:59:59.999Z"

    it("handles null due dates with empty label and not overdue", () => {
      const res = getTaskDueLabel(null, startISO, endISO, "UTC")
      expect(res.label).toBe("")
      expect(res.isOverdue).toBe(false)
    })

    it("identifies overdue tasks when due timestamp is before today start", () => {
      const yesterday = "2026-09-29T12:00:00.000Z"
      const res = getTaskDueLabel(yesterday, startISO, endISO, "UTC")
      expect(res.isOverdue).toBe(true)
      expect(res.label).toBe("Overdue")
    })

    it("identifies tasks due today", () => {
      const dueToday = "2026-09-30T15:30:00.000Z"
      const res = getTaskDueLabel(dueToday, startISO, endISO, "UTC")
      expect(res.isOverdue).toBe(false)
      expect(res.label).toContain("Today")
    })

    it("formats future dates cleanly", () => {
      const future = "2026-10-15T12:00:00.000Z"
      const res = getTaskDueLabel(future, startISO, endISO, "UTC")
      expect(res.isOverdue).toBe(false)
      expect(res.label).toBe("Oct 15")
    })
  })

  describe("5. Server Actions Validation & Security", () => {
    it("rejects quick task creation with empty title", async () => {
      const { createQuickTask } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("title", "   ")

      const result = await createQuickTask(formData)
      expect(result.error).toBe("Task title cannot be empty.")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("rejects quick task title longer than 255 characters", async () => {
      const { createQuickTask } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("title", "a".repeat(256))

      const result = await createQuickTask(formData)
      expect(result.error).toBe("Task title must be 255 characters or fewer.")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from creating quick tasks", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      })

      const { createQuickTask } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("title", "Write tests")

      const result = await createQuickTask(formData)
      expect(result.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("creates quick task with authenticated user identity", async () => {
      const { createQuickTask } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("title", "Deploy MyOS v1.0")
      formData.append("priority", "high")
      formData.append("dueToday", "true")

      const result = await createQuickTask(formData)
      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          title: "Deploy MyOS v1.0",
          priority: "high",
          status: "todo",
        })
      )
    })

    it("rejects quick note creation with empty content", async () => {
      const { createQuickNote } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("content", "  ")

      const result = await createQuickNote(formData)
      expect(result.error).toBe("Note content cannot be empty.")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("creates quick note and derives title from first line when omitted", async () => {
      const { createQuickNote } = await import("@/app/(app)/today/actions")
      const formData = new FormData()
      formData.append("content", "# Meeting Notes\nDiscussion about RLS policies.")

      const result = await createQuickNote(formData)
      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          title: "Meeting Notes",
          content: "# Meeting Notes\nDiscussion about RLS policies.",
        })
      )
    })

    it("toggles task status from todo to completed with completed_at timestamp", async () => {
      const { toggleTaskStatus } = await import("@/app/(app)/today/actions")

      const result = await toggleTaskStatus("task-123", "todo")
      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      )
    })

    it("toggles task status from completed back to todo with null completed_at", async () => {
      const { toggleTaskStatus } = await import("@/app/(app)/today/actions")

      const result = await toggleTaskStatus("task-123", "completed")
      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "todo",
          completed_at: null,
        })
      )
    })
  })
})
