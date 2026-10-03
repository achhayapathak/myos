import type { Reminder } from "@/types/database"

export type ReminderFilter = "all" | "upcoming" | "past_due" | "completed"

export interface ReminderWithMeta extends Reminder {
  isPastDue: boolean
  formattedScheduledAt: string
  relativeLabel: string
}

export interface ReminderFormInput {
  id?: string
  title: string
  scheduledDate: string // YYYY-MM-DD
  scheduledTime: string // HH:mm
  timeZone?: string
}

export interface RemindersPageData {
  reminders: Reminder[]
  timeZone: string
  user: {
    id: string
    email?: string | null
  }
}
