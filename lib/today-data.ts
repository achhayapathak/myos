import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Task, Event, PomodoroSession, Reminder } from "@/types/database"
import {
  getTodayDateBounds,
  type TodayDateBounds,
  type FocusSummary,
} from "./today-utils"

export {
  getTodayDateBounds,
  formatEventTime,
  getTaskDueLabel,
  type TodayDateBounds,
  type FocusSummary,
} from "./today-utils"

export interface TodayDashboardData {
  user: {
    id: string
    displayName: string | null
    email: string | null
  }
  bounds: TodayDateBounds
  tasksDueToday: Task[]
  highPriorityTasks?: Task[]
  reminders: Reminder[]
  completedTasksTodayCount: number
  upcomingEvents: Event[]
  focusSummary: FocusSummary
}

/**
 * Fetches all necessary Today dashboard data server-side in parallel.
 * Adheres strictly to PostgreSQL Row Level Security.
 */
export async function getTodayDashboardData(): Promise<TodayDashboardData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // 1. Fetch user's profile for timezone and display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("user_id", user.id)
    .maybeSingle()

  const timeZone = profile?.timezone || "Asia/Kolkata"
  const displayName = profile?.display_name || user.email?.split("@")[0] || "there"
  const bounds = getTodayDateBounds(timeZone)

  // 2. Execute queries in parallel
  const [
    dueTodayResult,
    remindersResult,
    completedTodayResult,
    eventsResult,
    sessionsResult,
  ] = await Promise.all([
    // A. Tasks due on or before today that are incomplete
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["todo", "in_progress"])
      .lte("due_at", bounds.endISO)
      .order("due_at", { ascending: true }),

    // B. Active reminders ordered by remind_at ASC
    supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("remind_at", { ascending: true })
      .limit(10),

    // C. Completed tasks count for today
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", bounds.startISO),

    // D. Upcoming events starting or ongoing today
    supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_at", bounds.startISO)
      .order("start_at", { ascending: true })
      .limit(6),

    // E. Pomodoro sessions (active or started today)
    supabase
      .from("pomodoro_sessions")
      .select("*, tasks(title)")
      .eq("user_id", user.id)
      .or(`ended_at.is.null,started_at.gte.${bounds.startISO}`)
      .order("started_at", { ascending: false }),
  ])

  // Process tasks due today
  const tasksDueToday: Task[] = dueTodayResult.data || []

  // Process active reminders
  const reminders: Reminder[] = (remindersResult.data as Reminder[]) || []
  const highPriorityTasks: Task[] = []

  // Process completed tasks count
  const completedTasksTodayCount = completedTodayResult.count || 0

  // Process upcoming events
  const upcomingEvents: Event[] = eventsResult.data || []

  // Process pomodoro sessions
  const sessions = sessionsResult.data || []
  const activeSessionRaw = sessions.find((s) => s.ended_at === null)

  let activeSession: (PomodoroSession & { task_title?: string | null }) | null = null
  if (activeSessionRaw) {
    const taskTitle =
      activeSessionRaw.tasks && typeof activeSessionRaw.tasks === "object"
        ? (activeSessionRaw.tasks as { title?: string }).title || null
        : null

    activeSession = {
      id: activeSessionRaw.id,
      user_id: activeSessionRaw.user_id,
      type: activeSessionRaw.type,
      duration_seconds: activeSessionRaw.duration_seconds,
      started_at: activeSessionRaw.started_at,
      ended_at: activeSessionRaw.ended_at,
      task_id: activeSessionRaw.task_id,
      created_at: activeSessionRaw.created_at,
      updated_at: activeSessionRaw.updated_at,
      task_title: taskTitle,
    }
  }

  // Filter completed focus sessions today
  const completedFocusSessions = sessions.filter(
    (s) => s.ended_at !== null && s.type === "focus"
  )

  const totalFocusSeconds = completedFocusSessions.reduce(
    (acc, s) => acc + (s.duration_seconds || 0),
    0
  )

  const focusSummary: FocusSummary = {
    activeSession,
    completedSessionsToday: completedFocusSessions.length,
    totalFocusMinutesToday: Math.round(totalFocusSeconds / 60),
  }

  return {
    user: {
      id: user.id,
      displayName,
      email: user.email || null,
    },
    bounds,
    tasksDueToday,
    reminders,
    highPriorityTasks,
    completedTasksTodayCount,
    upcomingEvents,
    focusSummary,
  }
}
