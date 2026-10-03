import { z } from "zod"

export const reminderIdSchema = z.string().uuid("Invalid reminder ID format")

export const createReminderSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  remind_at: z.string().datetime({ message: "Invalid scheduled timestamp format" }),
})

export const updateReminderSchema = z.object({
  id: reminderIdSchema,
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  remind_at: z.string().datetime({ message: "Invalid scheduled timestamp format" }),
  completed: z.boolean().optional(),
})

export const deleteReminderSchema = z.object({
  id: reminderIdSchema,
})

export const toggleReminderCompletedSchema = z.object({
  id: reminderIdSchema,
  completed: z.boolean(),
})

export const reminderFormInputSchema = z.object({
  id: reminderIdSchema.optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  scheduledTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"),
  timeZone: z.string().default("Asia/Kolkata"),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>
export type DeleteReminderInput = z.infer<typeof deleteReminderSchema>
export type ToggleReminderCompletedInput = z.infer<typeof toggleReminderCompletedSchema>
export type ReminderFormValues = z.infer<typeof reminderFormInputSchema>
