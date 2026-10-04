import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Habit } from "@/types/database"
import { resolveTimeZone } from "@/lib/calendar/timezone-utils"
import {
  getLocalDateString,
  formatHabitDate,
  isHabitScheduledForDate,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateCompletionRate,
  getHabitScheduleDescription,
  addDays,
  getDatesInRange,
  getISOWeekday,
} from "./calculations"
import type {
  HabitsPageData,
  HabitWithStats,
  HabitHistoryDay,
  TodayHabitsData,
  TodayHabitItem,
} from "./types"

/**
 * Server-only data fetcher for the main Habits page.
 * Enforces authenticated session and PostgreSQL Row Level Security.
 * Bounded history window: past 90 days.
 */
export async function getHabitsPageData(): Promise<HabitsPageData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // Concurrently fetch profile and habits
  const [profileResult, habitsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ])

  const timeZone = resolveTimeZone(profileResult.data?.timezone)
  const todayDate = getLocalDateString(new Date(), timeZone)
  const formattedTodayDate = formatHabitDate(todayDate, timeZone)

  const habits = (habitsResult.data as Habit[]) || []
  if (habits.length === 0) {
    return {
      todayDate,
      formattedTodayDate,
      timeZone,
      activeHabits: [],
      archivedHabits: [],
      todayScheduledHabits: [],
      completedTodayCount: 0,
      totalScheduledTodayCount: 0,
    }
  }

  // Bounded completion query: past 90 days to today
  const historyStartDate = addDays(todayDate, -89)
  const { data: completionsData } = await supabase
    .from("habit_completions")
    .select("habit_id, completed_on")
    .eq("user_id", user.id)
    .gte("completed_on", historyStartDate)
    .lte("completed_on", todayDate)

  // Group completions by habit_id
  const completionsByHabit = new Map<string, Set<string>>()
  for (const c of completionsData || []) {
    let set = completionsByHabit.get(c.habit_id)
    if (!set) {
      set = new Set()
      completionsByHabit.set(c.habit_id, set)
    }
    set.add(c.completed_on)
  }

  // Recent 30 days range for heatmap display
  const recent30Days = getDatesInRange(addDays(todayDate, -29), todayDate)

  // Compute stats for each habit
  const enrichedHabits: HabitWithStats[] = habits.map((habit) => {
    const completedSet = completionsByHabit.get(habit.id) || new Set<string>()
    const completedDates = Array.from(completedSet)

    const isScheduledToday = isHabitScheduledForDate(habit, todayDate)
    const isCompletedToday = completedSet.has(todayDate)
    const currentStreak = calculateCurrentStreak(habit, completedSet, todayDate)
    const longestStreak = calculateLongestStreak(habit, completedSet, {
      endDateStr: todayDate,
    })

    // Calculate completion rate over the last 30 days
    const rateStartDate = addDays(todayDate, -29)
    const completionRate = calculateCompletionRate(
      habit,
      completedSet,
      rateStartDate,
      todayDate
    )

    // Build 30-day day-by-day history
    const recentHistory: HabitHistoryDay[] = recent30Days.map((d) => ({
      date: d,
      dayOfWeek: getISOWeekday(d),
      isScheduled: isHabitScheduledForDate(habit, d),
      isCompleted: completedSet.has(d),
      isToday: d === todayDate,
    }))

    return {
      ...habit,
      currentStreak,
      longestStreak,
      completionRate,
      isCompletedToday,
      isScheduledToday,
      scheduleLabel: getHabitScheduleDescription(habit),
      completedDates,
      recentHistory,
    }
  })

  const activeHabits = enrichedHabits.filter((h) => !h.archived)
  const archivedHabits = enrichedHabits.filter((h) => h.archived)

  const todayScheduledHabits = activeHabits.filter((h) => h.isScheduledToday)
  const completedTodayCount = todayScheduledHabits.filter(
    (h) => h.isCompletedToday
  ).length
  const totalScheduledTodayCount = todayScheduledHabits.length

  return {
    todayDate,
    formattedTodayDate,
    timeZone,
    activeHabits,
    archivedHabits,
    todayScheduledHabits,
    completedTodayCount,
    totalScheduledTodayCount,
  }
}

/**
 * Server-only data fetcher for the Today dashboard widget.
 * Ultra-lightweight and fast: fetches only active habits scheduled for today
 * and their completions for today and the recent streak window.
 */
export async function getTodayHabitsData(): Promise<TodayHabitsData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // 1. Fetch profile timezone & active habits in parallel
  const [profileResult, habitsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("habits")
      .select("id, name, description, frequency_type, target_days, color, created_at, archived")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ])

  const timeZone = resolveTimeZone(profileResult.data?.timezone)
  const todayDate = getLocalDateString(new Date(), timeZone)

  const allActiveHabits = (habitsResult.data as Habit[]) || []
  // Filter only habits scheduled for today
  const scheduledHabits = allActiveHabits.filter((h) =>
    isHabitScheduledForDate(h, todayDate)
  )

  if (scheduledHabits.length === 0) {
    return {
      todayDate,
      timeZone,
      habits: [],
      completedCount: 0,
      totalCount: 0,
    }
  }

  // 2. Fetch completions for scheduled habits (bounded: past 60 days to today for streak calculation)
  const habitIds = scheduledHabits.map((h) => h.id)
  const streakLookbackDate = addDays(todayDate, -59)

  const { data: completionsData } = await supabase
    .from("habit_completions")
    .select("habit_id, completed_on")
    .eq("user_id", user.id)
    .in("habit_id", habitIds)
    .gte("completed_on", streakLookbackDate)
    .lte("completed_on", todayDate)

  const completionsByHabit = new Map<string, Set<string>>()
  for (const c of completionsData || []) {
    let set = completionsByHabit.get(c.habit_id)
    if (!set) {
      set = new Set()
      completionsByHabit.set(c.habit_id, set)
    }
    set.add(c.completed_on)
  }

  let completedCount = 0
  const items: TodayHabitItem[] = scheduledHabits.map((h) => {
    const completedSet = completionsByHabit.get(h.id) || new Set<string>()
    const isCompleted = completedSet.has(todayDate)
    if (isCompleted) {
      completedCount++
    }
    const currentStreak = calculateCurrentStreak(h, completedSet, todayDate)

    return {
      id: h.id,
      name: h.name,
      description: h.description,
      frequency_type: h.frequency_type,
      target_days: h.target_days,
      color: h.color,
      isCompleted,
      currentStreak,
    }
  })

  return {
    todayDate,
    timeZone,
    habits: items,
    completedCount,
    totalCount: items.length,
  }
}
