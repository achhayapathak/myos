import { z } from "zod"
import type { PomodoroType } from "@/types/database"
import { DEFAULT_DURATIONS } from "./timer-utils"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const pomodoroTypeSchema = z.enum([
  "focus",
  "short_break",
  "long_break",
]) satisfies z.ZodType<PomodoroType>

export const startSessionSchema = z.object({
  type: pomodoroTypeSchema.default("focus"),
  duration_seconds: z
    .number()
    .int("Duration must be an integer.")
    .positive("Duration must be greater than zero.")
    .max(14400, "Maximum session duration is 4 hours.")
    .optional(),
  task_id: z
    .string()
    .regex(uuidPattern, "Invalid task ID format.")
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val : null)),
}).transform((data) => ({
  ...data,
  duration_seconds: data.duration_seconds || DEFAULT_DURATIONS[data.type],
}))

export const completeSessionSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid session ID format."),
  ended_at: z
    .string()
    .datetime()
    .optional(),
})

export const cancelSessionSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid session ID format."),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
