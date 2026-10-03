import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { PomodoroSession, Task } from "@/types/database"
import { getTodayDateBounds, type TodayDateBounds } from "@/lib/today-utils"

export type ActivePomodoroSession = PomodoroSession & {
  task_title?: string | null
}

export interface FocusPageData {
  user: {
    id: string
    displayName: string | null
    email: string | null
  }
  activeSession: ActivePomodoroSession | null
  completedSessionsToday: (PomodoroSession & { task_title?: string | null })[]
  totalFocusMinutesToday: number
  availableTasks: Pick<Task, "id" | "title" | "priority" | "status">[]
  bounds: TodayDateBounds
  timeZone: string
}

/**
 * Server-only data fetcher for the Focus / Pomodoro page.
 * Enforces session authentication and Row Level Security.
 */
export async function getFocusPageData(): Promise<FocusPageData | null> {
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

  const timeZone = profile?.timezone || "Asia/Kolkata"
  const bounds = getTodayDateBounds(timeZone)

  // 2. Parallel queries for active session, completed sessions today, and available tasks
  const [activeSessionRes, completedRes, tasksRes] = await Promise.all([
    // Active session (ended_at is null)
    supabase
      .from("pomodoro_sessions")
      .select("*, tasks(title)")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .maybeSingle(),

    // Completed sessions today
    supabase
      .from("pomodoro_sessions")
      .select("*, tasks(title)")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .gte("started_at", bounds.startISO)
      .order("started_at", { ascending: false }),

    // Incomplete tasks available for association
    supabase
      .from("tasks")
      .select("id, title, priority, status")
      .eq("user_id", user.id)
      .in("status", ["todo", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30),
  ])

  // Process active session
  let activeSession: ActivePomodoroSession | null = null
  if (activeSessionRes.data) {
    const raw = activeSessionRes.data
    const taskTitle =
      raw.tasks && typeof raw.tasks === "object"
        ? (raw.tasks as { title?: string }).title || null
        : null

    activeSession = {
      id: raw.id,
      user_id: raw.user_id,
      type: raw.type,
      duration_seconds: raw.duration_seconds,
      started_at: raw.started_at,
      ended_at: raw.ended_at,
      task_id: raw.task_id,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      task_title: taskTitle,
    }
  }

  // Process completed sessions today
  const completedRaw = completedRes.data || []
  const completedSessionsToday = completedRaw.map((s) => {
    const taskTitle =
      s.tasks && typeof s.tasks === "object"
        ? (s.tasks as { title?: string }).title || null
        : null
    return {
      ...s,
      task_title: taskTitle,
    }
  })

  // Calculate focus minutes (only for 'focus' type)
  const totalFocusSeconds = completedSessionsToday
    .filter((s) => s.type === "focus")
    .reduce((acc, s) => acc + (s.duration_seconds || 0), 0)

  const totalFocusMinutesToday = Math.round(totalFocusSeconds / 60)

  return {
    user: {
      id: user.id,
      displayName: profile?.display_name || user.email?.split("@")[0] || null,
      email: user.email || null,
    },
    activeSession,
    completedSessionsToday,
    totalFocusMinutesToday,
    availableTasks: tasksRes.data || [],
    bounds,
    timeZone,
  }
}
