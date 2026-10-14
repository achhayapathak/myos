import { z } from "zod"

export const waitlistEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(320, "Email address is too long."),
  honeypot: z
    .string()
    .max(0, "Bot detected.")
    .optional()
    .default(""),
})

export type WaitlistInput = z.infer<typeof waitlistEmailSchema>

/**
 * Normalizes an email address: trims whitespace and lowercases.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
