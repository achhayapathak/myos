import { z } from "zod"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(255, "Note title must be 255 characters or fewer.")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  content: z
    .string()
    .optional()
    .default(""),
})

export const updateNoteSchema = z.object({
  id: z.string().regex(uuidPattern, "Invalid note ID format."),
  title: z
    .string()
    .trim()
    .min(1, "Note title cannot be empty.")
    .max(255, "Note title must be 255 characters or fewer.")
    .optional(),
  content: z
    .string()
    .optional(),
})

export const searchNotesSchema = z.object({
  query: z.string().trim().max(100).default(""),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
