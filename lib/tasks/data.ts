import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Task } from "@/types/database"
import { getTodayDateBounds, type TodayDateBounds } from "@/lib/today-utils"

export interface TasksPageData {
  user: {
    id: string
    displayName: string | null
    email: string | null
  }
  tasks: Task[]
  bounds: TodayDateBounds
  timeZone: string
}

/**
 * Server-only data fetcher for the Tasks page.
 * Strictly verifies authenticated user session and enforces Row Level Security.
 */
export async function getTasksPageData(): Promise<TasksPageData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // Fetch user profile for timezone and display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("user_id", user.id)
    .maybeSingle()

  const timeZone = profile?.timezone || "Asia/Kolkata"
  const bounds = getTodayDateBounds(timeZone)

  // Fetch all tasks owned by this authenticated user
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch user tasks:", error.message)
    return null
  }

  return {
    user: {
      id: user.id,
      displayName: profile?.display_name || user.email?.split("@")[0] || null,
      email: user.email || null,
    },
    tasks: tasks || [],
    bounds,
    timeZone,
  }
}
