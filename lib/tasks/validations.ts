import { z } from "zod"
import type { TaskPriority, TaskStatus } from "@/types/database"

export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "completed",
  "cancelled",
]) satisfies z.ZodType<TaskStatus>

export const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
]) satisfies z.ZodType<TaskPriority>

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty.")
    .max(255, "Task title must be 255 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("todo"),
  due_at: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true
        const parsed = Date.parse(val)
        return !isNaN(parsed)
      },
      { message: "Due date must be a valid ISO date timestamp." }
    )
    .transform((val) => (val && val.trim() !== "" ? new Date(val).toISOString() : null)),
})

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const updateTaskSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid task ID format."),
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty.")
    .max(255, "Task title must be 255 characters or fewer.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .nullable()
    .optional()
    .transform((val) => (val === undefined ? undefined : val && val.length > 0 ? val : null)),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  due_at: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === null || val.trim() === "") return true
        const parsed = Date.parse(val)
        return !isNaN(parsed)
      },
      { message: "Due date must be a valid ISO date timestamp." }
    )
    .transform((val) =>
      val === undefined
        ? undefined
        : val && val.trim() !== ""
        ? new Date(val).toISOString()
        : null
    ),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
