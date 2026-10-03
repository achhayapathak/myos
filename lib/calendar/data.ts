import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Event as DbEvent } from "@/types/database"
import { resolveTimeZone } from "./timezone-utils"
import type { CalendarPageData } from "./types"

/**
 * Server-only data fetcher for the Calendar page.
 * Enforces session authentication and Row Level Security.
 */
export async function getCalendarPageData(): Promise<CalendarPageData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // 1. Fetch user timezone from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("user_id", user.id)
    .maybeSingle()

  const timeZone = resolveTimeZone(profile?.timezone)

  // 2. Fetch user events
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .order("start_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch calendar events:", error.message)
  }

  return {
    events: (events as DbEvent[]) ?? [],
    timeZone,
    user: {
      id: user.id,
      email: user.email,
    },
  }
}
