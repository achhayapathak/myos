import { z } from "zod"

export const habitIdSchema = z.string().uuid("Invalid habit ID format")

export const habitFrequencySchema = z.enum(["daily", "weekly"])

export const targetDaySchema = z
  .number()
  .int()
  .min(1, "Day must be between 1 (Monday) and 7 (Sunday)")
  .max(7, "Day must be between 1 (Monday) and 7 (Sunday)")

export const createHabitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or fewer"),
    description: z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or fewer")
      .optional()
      .nullable()
      .transform((val) => (val ? val : null)),
    frequency_type: habitFrequencySchema,
    target_days: z.array(targetDaySchema).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.frequency_type === "weekly") {
        return (
          Array.isArray(data.target_days) &&
          data.target_days.length > 0 &&
          data.target_days.every((d) => d >= 1 && d <= 7)
        )
      }
      return true
    },
    {
      message: "Weekly habits require at least one target day",
      path: ["target_days"],
    }
  )

export const quickCreateHabitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Habit name is required")
    .max(100, "Habit name must be 100 characters or fewer"),
})

export const updateHabitSchema = z
  .object({
    id: habitIdSchema,
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or fewer"),
    description: z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or fewer")
      .optional()
      .nullable()
      .transform((val) => (val ? val : null)),
    frequency_type: habitFrequencySchema,
    target_days: z.array(targetDaySchema).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
    archived: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.frequency_type === "weekly") {
        return (
          Array.isArray(data.target_days) &&
          data.target_days.length > 0 &&
          data.target_days.every((d) => d >= 1 && d <= 7)
        )
      }
      return true
    },
    {
      message: "Weekly habits require at least one target day",
      path: ["target_days"],
    }
  )

export const toggleHabitArchiveSchema = z.object({
  id: habitIdSchema,
  archived: z.boolean(),
})

export const deleteHabitSchema = z.object({
  id: habitIdSchema,
})

export const toggleHabitCompletionSchema = z.object({
  habitId: habitIdSchema,
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD"),
  completed: z.boolean(),
})

export type CreateHabitInput = z.infer<typeof createHabitSchema>
export type QuickCreateHabitInput = z.infer<typeof quickCreateHabitSchema>
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>
export type ToggleHabitArchiveInput = z.infer<typeof toggleHabitArchiveSchema>
export type DeleteHabitInput = z.infer<typeof deleteHabitSchema>
export type ToggleHabitCompletionInput = z.infer<typeof toggleHabitCompletionSchema>
