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

  // Concurrently fetch profile and events in parallel to eliminate waterfall
  const [profileResult, eventsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone, display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_at", { ascending: true }),
  ])

  const timeZone = resolveTimeZone(profileResult.data?.timezone)
  const events = eventsResult.data

  if (eventsResult.error) {
    console.error("Failed to fetch calendar events:", eventsResult.error.message)
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
