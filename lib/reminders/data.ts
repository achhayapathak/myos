import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Reminder } from "@/types/database"
import { resolveTimeZone } from "@/lib/calendar/timezone-utils"
import type { RemindersPageData } from "./types"

/**
 * Server-only data fetcher for the Reminders page.
 * Enforces session authentication and Row Level Security.
 */
export async function getRemindersPageData(): Promise<RemindersPageData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // Concurrently fetch user profile and reminders in parallel to eliminate waterfall
  const [profileResult, remindersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("completed", { ascending: true })
      .order("remind_at", { ascending: true }),
  ])

  const timeZone = resolveTimeZone(profileResult.data?.timezone)
  const reminders = remindersResult.data

  if (remindersResult.error) {
    console.error("Failed to fetch reminders:", remindersResult.error.message)
  }

  return {
    reminders: (reminders as Reminder[]) ?? [],
    timeZone,
    user: {
      id: user.id,
      email: user.email,
    },
  }
}
