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
  type: z
    .enum(["focus", "short_break", "long_break", "short_focus", "long_focus"])
    .default("focus"),
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
}).transform((data) => {
  let normalizedType: PomodoroType = "focus"
  let defaultDuration = DEFAULT_DURATIONS.focus

  if (data.type === "long_focus") {
    normalizedType = "focus"
    defaultDuration = 50 * 60
  } else if (data.type === "short_focus") {
    normalizedType = "focus"
    defaultDuration = 25 * 60
  } else if (data.type === "short_break") {
    normalizedType = "short_break"
    defaultDuration = DEFAULT_DURATIONS.short_break
  } else if (data.type === "long_break") {
    normalizedType = "long_break"
    defaultDuration = DEFAULT_DURATIONS.long_break
  }

  return {
    type: normalizedType,
    duration_seconds: data.duration_seconds || defaultDuration,
    task_id: data.task_id,
  }
})

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

export const pauseSessionSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid session ID format."),
  remaining_seconds: z
    .number()
    .int()
    .positive("Remaining seconds must be greater than zero.")
    .optional(),
})

export const resumeSessionSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid session ID format."),
  remaining_seconds: z
    .number()
    .int()
    .positive("Remaining seconds must be greater than zero."),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
export type PauseSessionInput = z.infer<typeof pauseSessionSchema>
export type ResumeSessionInput = z.infer<typeof resumeSessionSchema>
