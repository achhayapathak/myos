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

  // 1. Fetch user timezone from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle()

  const timeZone = resolveTimeZone(profile?.timezone)

  // 2. Fetch all user reminders: uncompleted first, then ordered by remind_at
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("completed", { ascending: true })
    .order("remind_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch reminders:", error.message)
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
