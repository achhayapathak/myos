import type { Event as DbEvent } from "@/types/database"

export type CalendarViewMode = "dayGridMonth" | "timeGridWeek" | "timeGridDay"

export interface CalendarEventDTO {
  id: string
  title: string
  description: string | null
  start: string
  end?: string
  allDay: boolean
  start_at: string
  end_at: string | null
}

export interface EventFormInput {
  id?: string
  title: string
  description?: string | null
  all_day: boolean
  startDate: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endDate?: string // YYYY-MM-DD
  endTime?: string // HH:mm
  timeZone?: string
}

export interface CalendarPageData {
  events: DbEvent[]
  timeZone: string
  user: {
    id: string
    email?: string | null
  }
}
