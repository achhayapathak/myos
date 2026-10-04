import type { Habit } from "@/types/database"

export interface HabitHistoryDay {
  date: string
  dayOfWeek: number
  isScheduled: boolean
  isCompleted: boolean
  isToday: boolean
}

export interface HabitWithStats extends Habit {
  currentStreak: number
  longestStreak: number
  completionRate: number
  isCompletedToday: boolean
  isScheduledToday: boolean
  scheduleLabel: string
  completedDates: string[]
  recentHistory: HabitHistoryDay[]
}

export interface HabitsPageData {
  todayDate: string
  formattedTodayDate: string
  timeZone: string
  activeHabits: HabitWithStats[]
  archivedHabits: HabitWithStats[]
  todayScheduledHabits: HabitWithStats[]
  completedTodayCount: number
  totalScheduledTodayCount: number
}

export interface TodayHabitItem {
  id: string
  name: string
  description: string | null
  frequency_type: "daily" | "weekly"
  target_days: number[] | null
  color: string | null
  reminder_time?: string | null
  isCompleted: boolean
  currentStreak: number
}

export interface TodayHabitsData {
  todayDate: string
  timeZone: string
  habits: TodayHabitItem[]
  completedCount: number
  totalCount: number
}

export interface HabitActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
