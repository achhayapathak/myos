import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notificationService } from "@/lib/notifications/service"
import { resolveTimeZone } from "@/lib/calendar/timezone-utils"
import { getLocalDateString, isHabitScheduledForDate } from "@/lib/habits/calculations"
import type { Habit } from "@/types/database"

export const dynamic = "force-dynamic"

/**
 * Scheduled Cron Handler for Habit Reminder Notifications.
 * Supports:
 *   1. Morning Smart Kickoff (daily digest of today's scheduled habits)
 *   2. Evening Smart Streak Saver (daily prompt if scheduled habits remain incomplete)
 *   3. Per-Habit Custom Reminder Times (precise alerts at each habit's scheduled time)
 *
 * Can be triggered via Vercel Cron, external webhook, or Supabase pg_cron.
 * Secures requests with CRON_SECRET if configured.
 */
export async function GET(request: Request) {
  return handleHabitReminders(request)
}

export async function POST(request: Request) {
  return handleHabitReminders(request)
}

async function handleHabitReminders(request: Request) {
  // Verify CRON_SECRET if configured in environment
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization")
    const cronHeader = request.headers.get("x-cron-secret")
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (bearerSecret !== expectedSecret && cronHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // 1. Fetch all profiles with habit notifications enabled
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("user_id, timezone, habit_notifications_enabled, habit_morning_time, habit_evening_time")
    .eq("habit_notifications_enabled", true)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, processedUsers: 0, dispatched: 0 })
  }

  let totalDispatched = 0
  const now = new Date()

  for (const profile of profiles) {
    const timeZone = resolveTimeZone(profile.timezone)
    const todayDate = getLocalDateString(now, timeZone)

    // Format current time in user's timezone as HH:mm
    const userLocalTime = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now)

    // 2. Fetch active habits for this user
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("archived", false)

    const habits = (habitsData as Habit[]) || []
    if (habits.length === 0) continue

    // Filter habits scheduled for today
    const scheduledToday = habits.filter((h) => isHabitScheduledForDate(h, todayDate))
    if (scheduledToday.length === 0) continue

    // Fetch completions for today
    const { data: completionsData } = await supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", profile.user_id)
      .eq("completed_on", todayDate)

    const completedHabitIds = new Set((completionsData || []).map((c) => c.habit_id))
    const incompleteToday = scheduledToday.filter((h) => !completedHabitIds.has(h.id))

    const morningTime = profile.habit_morning_time || "09:00"
    const eveningTime = profile.habit_evening_time || "20:00"

    // A. Morning Kickoff Smart Check-in
    if (userLocalTime === morningTime) {
      const habitNames = scheduledToday.map((h) => h.name)
      await notificationService.sendHabitDailyDigestPush(supabase, profile.user_id, {
        type: "morning",
        habitNames,
      })
      totalDispatched++
    }

    // B. Evening Streak Saver Smart Check-in (only if incomplete habits exist)
    if (userLocalTime === eveningTime && incompleteToday.length > 0) {
      const habitNames = incompleteToday.map((h) => h.name)
      await notificationService.sendHabitDailyDigestPush(supabase, profile.user_id, {
        type: "evening",
        habitNames,
      })
      totalDispatched++
    }

    // C. Individual Per-Habit Custom Reminders
    for (const habit of scheduledToday) {
      if (
        habit.reminder_time &&
        habit.reminder_time === userLocalTime &&
        !completedHabitIds.has(habit.id)
      ) {
        await notificationService.sendHabitReminderPush(supabase, profile.user_id, {
          habitId: habit.id,
          habitName: habit.name,
          description: habit.description,
        })
        totalDispatched++
      }
    }
  }

  return NextResponse.json({
    success: true,
    processedUsers: profiles.length,
    dispatched: totalDispatched,
  })
}
