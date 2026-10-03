import { z } from "zod"

export const eventIdSchema = z.string().uuid("Invalid event ID format")

export const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or fewer"),
    description: z.string().trim().max(2000, "Description too long").nullish(),
    all_day: z.boolean().default(false),
    start_at: z.string().datetime({ message: "Invalid start timestamp format" }),
    end_at: z.string().datetime({ message: "Invalid end timestamp format" }).nullish(),
  })
  .refine(
    (data) => {
      if (!data.end_at) return true
      return new Date(data.end_at).getTime() >= new Date(data.start_at).getTime()
    },
    {
      message: "End time must be after or equal to start time",
      path: ["end_at"],
    }
  )

export const updateEventSchema = z
  .object({
    id: eventIdSchema,
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or fewer"),
    description: z.string().trim().max(2000, "Description too long").nullish(),
    all_day: z.boolean().default(false),
    start_at: z.string().datetime({ message: "Invalid start timestamp format" }),
    end_at: z.string().datetime({ message: "Invalid end timestamp format" }).nullish(),
  })
  .refine(
    (data) => {
      if (!data.end_at) return true
      return new Date(data.end_at).getTime() >= new Date(data.start_at).getTime()
    },
    {
      message: "End time must be after or equal to start time",
      path: ["end_at"],
    }
  )

export const deleteEventSchema = z.object({
  id: eventIdSchema,
})

export const eventFormInputSchema = z
  .object({
    id: eventIdSchema.optional(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or fewer"),
    description: z.string().trim().max(2000).nullish(),
    all_day: z.boolean().default(false),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
      .optional()
      .or(z.literal("")),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
      .optional()
      .or(z.literal("")),
    timeZone: z.string().default("Asia/Kolkata"),
  })
  .refine(
    (data) => {
      if (data.all_day) {
        if (!data.endDate) return true
        return data.endDate >= data.startDate
      }

      // Timed event
      if (!data.endTime) return true
      const startDateTimeStr = `${data.startDate}T${data.startTime || "00:00"}`
      const endDateTimeStr = `${data.endDate || data.startDate}T${data.endTime}`
      return endDateTimeStr >= startDateTimeStr
    },
    {
      message: "End time must be after or equal to start time",
      path: ["endTime"],
    }
  )

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type DeleteEventInput = z.infer<typeof deleteEventSchema>
export type EventFormValues = z.infer<typeof eventFormInputSchema>
