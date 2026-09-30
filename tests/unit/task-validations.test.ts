import { describe, it, expect } from "vitest"
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
  taskPrioritySchema,
} from "@/lib/tasks/validations"
import {
  filterTasks,
  sortTasks,
  getTaskCounts,
  formatDueDate,
} from "@/lib/tasks/utils"
import type { Task } from "@/types/database"

describe("Task Validations & Pure Utilities", () => {
  describe("1. Zod Schema Validation", () => {
    describe("taskStatusSchema & taskPrioritySchema", () => {
      it("validates all 4 task statuses", () => {
        expect(taskStatusSchema.parse("todo")).toBe("todo")
        expect(taskStatusSchema.parse("in_progress")).toBe("in_progress")
        expect(taskStatusSchema.parse("completed")).toBe("completed")
        expect(taskStatusSchema.parse("cancelled")).toBe("cancelled")

        expect(() => taskStatusSchema.parse("invalid_status")).toThrow()
      })

      it("validates all 3 task priorities", () => {
        expect(taskPrioritySchema.parse("low")).toBe("low")
        expect(taskPrioritySchema.parse("medium")).toBe("medium")
        expect(taskPrioritySchema.parse("high")).toBe("high")

        expect(() => taskPrioritySchema.parse("urgent")).toThrow()
      })
    })

    describe("createTaskSchema", () => {
      it("accepts valid minimal task data and sets defaults", () => {
        const result = createTaskSchema.parse({
          title: "Buy groceries",
        })

        expect(result.title).toBe("Buy groceries")
        expect(result.priority).toBe("medium")
        expect(result.status).toBe("todo")
        expect(result.description).toBeNull()
        expect(result.due_at).toBeNull()
      })

      it("accepts complete task data with ISO due date", () => {
        const isoString = "2026-10-05T18:00:00.000Z"
        const result = createTaskSchema.parse({
          title: "Complete audit",
          description: "Review security findings and RLS tests",
          priority: "high",
          status: "in_progress",
          due_at: isoString,
        })

        expect(result.title).toBe("Complete audit")
        expect(result.description).toBe("Review security findings and RLS tests")
        expect(result.priority).toBe("high")
        expect(result.status).toBe("in_progress")
        expect(result.due_at).toBe(isoString)
      })

      it("trims whitespace from title and description", () => {
        const result = createTaskSchema.parse({
          title: "  Padded title   ",
          description: "   Padded description   ",
        })

        expect(result.title).toBe("Padded title")
        expect(result.description).toBe("Padded description")
      })

      it("transforms empty string description to null", () => {
        const result = createTaskSchema.parse({
          title: "Title",
          description: "   ",
        })

        expect(result.description).toBeNull()
      })

      it("rejects empty title or whitespace-only title", () => {
        expect(() => createTaskSchema.parse({ title: "" })).toThrow(
          "Task title cannot be empty."
        )
        expect(() => createTaskSchema.parse({ title: "    " })).toThrow(
          "Task title cannot be empty."
        )
      })

      it("rejects title longer than 255 characters", () => {
        expect(() =>
          createTaskSchema.parse({ title: "a".repeat(256) })
        ).toThrow("Task title must be 255 characters or fewer.")
      })

      it("rejects description longer than 2000 characters", () => {
        expect(() =>
          createTaskSchema.parse({
            title: "Task",
            description: "a".repeat(2001),
          })
        ).toThrow("Description must be 2000 characters or fewer.")
      })

      it("rejects invalid date strings for due_at", () => {
        expect(() =>
          createTaskSchema.parse({
            title: "Task",
            due_at: "not-a-valid-date",
          })
        ).toThrow("Due date must be a valid ISO date timestamp.")
      })
    })

    describe("updateTaskSchema", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000"

      it("accepts valid UUID and partial updates", () => {
        const result = updateTaskSchema.parse({
          id: validUuid,
          title: "Updated Title",
          priority: "high",
        })

        expect(result.id).toBe(validUuid)
        expect(result.title).toBe("Updated Title")
        expect(result.priority).toBe("high")
        expect(result.description).toBeUndefined()
        expect(result.status).toBeUndefined()
      })

      it("rejects invalid UUID format", () => {
        expect(() =>
          updateTaskSchema.parse({
            id: "not-a-uuid",
            title: "Title",
          })
        ).toThrow("Invalid task ID format.")
      })

      it("rejects empty string title when provided in update", () => {
        expect(() =>
          updateTaskSchema.parse({
            id: validUuid,
            title: "   ",
          })
        ).toThrow("Task title cannot be empty.")
      })
    })
  })

  describe("2. Filtering & Sorting Utilities", () => {
    const startISO = "2026-09-30T00:00:00.000Z"
    const endISO = "2026-09-30T23:59:59.999Z"

    const sampleTasks: Task[] = [
      {
        id: "task-1",
        user_id: "user-1",
        title: "Finish payment gateway",
        description: "Stripe and Supabase integration",
        status: "todo",
        priority: "high",
        due_at: "2026-09-29T10:00:00.000Z", // Overdue
        completed_at: null,
        created_at: "2026-09-28T09:00:00.000Z",
        updated_at: "2026-09-28T09:00:00.000Z",
      },
      {
        id: "task-2",
        user_id: "user-1",
        title: "Write documentation",
        description: "API specs and setup guide",
        status: "in_progress",
        priority: "medium",
        due_at: "2026-09-30T17:00:00.000Z", // Due Today
        completed_at: null,
        created_at: "2026-09-29T11:00:00.000Z",
        updated_at: "2026-09-29T11:00:00.000Z",
      },
      {
        id: "task-3",
        user_id: "user-1",
        title: "Team sync meeting",
        description: "Weekly review",
        status: "completed",
        priority: "low",
        due_at: "2026-09-30T14:00:00.000Z",
        completed_at: "2026-09-30T15:00:00.000Z",
        created_at: "2026-09-30T08:00:00.000Z",
        updated_at: "2026-09-30T15:00:00.000Z",
      },
      {
        id: "task-4",
        user_id: "user-1",
        title: "Upgrade Postgres dependencies",
        description: "Check compatibility",
        status: "cancelled",
        priority: "medium",
        due_at: null, // No due date
        completed_at: null,
        created_at: "2026-09-25T10:00:00.000Z",
        updated_at: "2026-09-25T10:00:00.000Z",
      },
      {
        id: "task-5",
        user_id: "user-1",
        title: "Deploy PWA v2",
        description: "Web push notifications",
        status: "todo",
        priority: "high",
        due_at: "2026-10-10T12:00:00.000Z", // Upcoming
        completed_at: null,
        created_at: "2026-09-30T12:00:00.000Z",
        updated_at: "2026-09-30T12:00:00.000Z",
      },
    ]

    describe("filterTasks", () => {
      it("filters by status 'active' (todo + in_progress)", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "active",
          priorityFilter: "all",
          dueDateFilter: "all",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-1", "task-2", "task-5"])
      })

      it("filters by specific status 'completed'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "completed",
          priorityFilter: "all",
          dueDateFilter: "all",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-3"])
      })

      it("filters by priority 'high'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "high",
          dueDateFilter: "all",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-1", "task-5"])
      })

      it("filters by due date 'overdue'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "overdue",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-1"])
      })

      it("filters by due date 'today'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "today",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-2", "task-3"])
      })

      it("filters by due date 'upcoming'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "upcoming",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-5"])
      })

      it("filters by due date 'no_due_date'", () => {
        const filtered = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "no_due_date",
          searchQuery: "",
          startISO,
          endISO,
        })

        expect(filtered.map((t) => t.id)).toEqual(["task-4"])
      })

      it("filters by search query matching title or description (case-insensitive)", () => {
        const titleMatch = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "all",
          searchQuery: "payment",
          startISO,
          endISO,
        })
        expect(titleMatch.map((t) => t.id)).toEqual(["task-1"])

        const descMatch = filterTasks(sampleTasks, {
          statusFilter: "all",
          priorityFilter: "all",
          dueDateFilter: "all",
          searchQuery: "specs",
          startISO,
          endISO,
        })
        expect(descMatch.map((t) => t.id)).toEqual(["task-2"])
      })
    })

    describe("sortTasks", () => {
      it("sorts by priority descending (high -> medium -> low)", () => {
        const sorted = sortTasks(sampleTasks, "priority", "desc")
        const priorities = sorted.map((t) => t.priority)
        expect(priorities).toEqual(["high", "high", "medium", "medium", "low"])
      })

      it("sorts by due_at ascending (nulls last)", () => {
        const sorted = sortTasks(sampleTasks, "due_at", "asc")
        expect(sorted[0].id).toBe("task-1") // Sep 29
        expect(sorted[sorted.length - 1].due_at).toBeNull() // task-4 has null due_at
      })

      it("sorts by title alphabetically ascending", () => {
        const sorted = sortTasks(sampleTasks, "title", "asc")
        const titles = sorted.map((t) => t.title)
        expect(titles[0]).toBe("Deploy PWA v2")
        expect(titles[titles.length - 1]).toBe("Write documentation")
      })
    })

    describe("getTaskCounts", () => {
      it("computes accurate counts for tabs and metrics", () => {
        const counts = getTaskCounts(sampleTasks, startISO, endISO)

        expect(counts.all).toBe(5)
        expect(counts.active).toBe(3) // task-1, task-2, task-5
        expect(counts.todo).toBe(2) // task-1, task-5
        expect(counts.in_progress).toBe(1) // task-2
        expect(counts.completed).toBe(1) // task-3
        expect(counts.cancelled).toBe(1) // task-4
        expect(counts.overdue).toBe(1) // task-1
        expect(counts.dueToday).toBe(1) // task-2 (incomplete due today)
      })
    })

    describe("formatDueDate", () => {
      it("formats null due date cleanly", () => {
        const res = formatDueDate(null, startISO, endISO)
        expect(res.label).toBe("")
        expect(res.isOverdue).toBe(false)
        expect(res.isToday).toBe(false)
      })

      it("formats overdue date", () => {
        const res = formatDueDate("2026-09-28T12:00:00.000Z", startISO, endISO)
        expect(res.label).toBe("Overdue")
        expect(res.isOverdue).toBe(true)
        expect(res.isToday).toBe(false)
      })

      it("formats date due today", () => {
        const res = formatDueDate("2026-09-30T14:30:00.000Z", startISO, endISO, "UTC")
        expect(res.isOverdue).toBe(false)
        expect(res.isToday).toBe(true)
        expect(res.label).toContain("Today")
      })
    })
  })
})
