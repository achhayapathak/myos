"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { headers } from "next/headers"
import { createHash } from "crypto"
import { waitlistEmailSchema, normalizeEmail } from "./validation"
import { sendWaitlistNotification } from "@/lib/email/resend"

const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX_ATTEMPTS = 5

export type WaitlistState = {
  success: boolean
  message: string
} | null

function hashIp(ip: string): string {
  return createHash("sha256").update(`waitlist-rl:${ip}`).digest("hex")
}

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const raw = {
    email: formData.get("email") as string | null ?? "",
    honeypot: (formData.get("company") as string | null) ?? "",
  }

  const parsed = waitlistEmailSchema.safeParse(raw)

  if (!parsed.success) {
    // If honeypot caught a bot, silently return "success" to avoid revealing detection
    const isHoneypot = parsed.error.issues.some(
      (i) => i.path.includes("honeypot")
    )
    if (isHoneypot) {
      return {
        success: true,
        message:
          "Your invitation request has been received. We'll be in touch with your access details.",
      }
    }
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid email address.",
    }
  }

  const email = normalizeEmail(parsed.data.email)

  // Get client IP for rate limiting
  const headersList = await headers()
  const forwarded = headersList.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  const ipHash = hashIp(ip)

  const supabase = createAdminClient()

  // Check rate limit
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString()

  const { count, error: rateLimitError } = await supabase
    .from("waitlist_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart)

  if (rateLimitError) {
    console.error("Rate limit check failed:", rateLimitError)
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    }
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      success: false,
      message: "Too many requests. Please try again later.",
    }
  }

  // Record rate limit entry
  await supabase.from("waitlist_rate_limits").insert({ ip_hash: ipHash })

  // Insert into waitlist
  const { error: insertError } = await supabase
    .from("waitlist")
    .insert({ email })

  if (insertError) {
    // Unique constraint violation — email already registered
    // Return success to avoid revealing whether the email exists
    if (insertError.code === "23505") {
      // Trigger notification for repeat interest (non-blocking)
      sendWaitlistNotification({ email, ip, isDuplicate: true }).catch((err) =>
        console.error("Waitlist repeat notification error:", err)
      )

      return {
        success: true,
        message:
          "Your invitation request has been received. We'll be in touch with your access details.",
      }
    }
    console.error("Waitlist insert failed:", insertError)
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    }
  }

  // Trigger notification email for new invitation request via Resend
  await sendWaitlistNotification({ email, ip, isDuplicate: false }).catch((err) =>
    console.error("Waitlist notification error:", err)
  )

  return {
    success: true,
    message:
      "Your invitation request has been received. We'll be in touch with your access details.",
  }
}
