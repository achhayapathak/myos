/**
 * MyOS Database TypeScript Definitions
 * Corresponding to PostgreSQL schema migration: 20260929000000_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled"
export type TaskPriority = "low" | "medium" | "high"
export type PomodoroType = "focus" | "short_break" | "long_break"

export type Profile = {
  id: string
  user_id: string
  display_name: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export type ProfileInsert = {
  id?: string
  user_id?: string
  display_name?: string | null
  timezone?: string
  created_at?: string
  updated_at?: string
}

export type ProfileUpdate = {
  id?: string
  user_id?: string
  display_name?: string | null
  timezone?: string
  created_at?: string
  updated_at?: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type TaskInsert = {
  id?: string
  user_id?: string
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_at?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type TaskUpdate = {
  id?: string
  user_id?: string
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_at?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export type NoteInsert = {
  id?: string
  user_id?: string
  title: string
  content?: string
  created_at?: string
  updated_at?: string
}

export type NoteUpdate = {
  id?: string
  user_id?: string
  title?: string
  content?: string
  created_at?: string
  updated_at?: string
}

export type Event = {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  created_at: string
  updated_at: string
}

export type EventInsert = {
  id?: string
  user_id?: string
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  all_day?: boolean
  created_at?: string
  updated_at?: string
}

export type EventUpdate = {
  id?: string
  user_id?: string
  title?: string
  description?: string | null
  start_at?: string
  end_at?: string | null
  all_day?: boolean
  created_at?: string
  updated_at?: string
}

export type PomodoroSession = {
  id: string
  user_id: string
  type: PomodoroType
  duration_seconds: number
  started_at: string
  ended_at: string | null
  task_id: string | null
  created_at: string
  updated_at: string
}

export type PomodoroSessionInsert = {
  id?: string
  user_id?: string
  type: PomodoroType
  duration_seconds: number
  started_at?: string
  ended_at?: string | null
  task_id?: string | null
  created_at?: string
  updated_at?: string
}

export type PomodoroSessionUpdate = {
  id?: string
  user_id?: string
  type?: PomodoroType
  duration_seconds?: number
  started_at?: string
  ended_at?: string | null
  task_id?: string | null
  created_at?: string
  updated_at?: string
}

export type Reminder = {
  id: string
  user_id: string
  title: string
  remind_at: string
  completed: boolean
  created_at: string
  updated_at: string
}

export type ReminderInsert = {
  id?: string
  user_id?: string
  title: string
  remind_at: string
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export type ReminderUpdate = {
  id?: string
  user_id?: string
  title?: string
  remind_at?: string
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export type PushSubscription = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  updated_at: string
}

export type PushSubscriptionInsert = {
  id?: string
  user_id?: string
  endpoint: string
  p256dh: string
  auth: string
  created_at?: string
  updated_at?: string
}

export type PushSubscriptionUpdate = {
  id?: string
  user_id?: string
  endpoint?: string
  p256dh?: string
  auth?: string
  created_at?: string
  updated_at?: string
}

export type NotificationDeliveryStatus = "pending" | "delivered" | "failed" | "cancelled"
export type NotificationDeliveryChannel = "web_push" | "in_app"

export type NotificationDelivery = {
  id: string
  user_id: string
  reminder_id: string | null
  channel: NotificationDeliveryChannel
  status: NotificationDeliveryStatus
  scheduled_at: string
  delivered_at: string | null
  payload: Json
  error_message: string | null
  created_at: string
  updated_at: string
}

export type NotificationDeliveryInsert = {
  id?: string
  user_id?: string
  reminder_id?: string | null
  channel?: NotificationDeliveryChannel
  status?: NotificationDeliveryStatus
  scheduled_at: string
  delivered_at?: string | null
  payload?: Json
  error_message?: string | null
  created_at?: string
  updated_at?: string
}

export type NotificationDeliveryUpdate = {
  id?: string
  user_id?: string
  reminder_id?: string | null
  channel?: NotificationDeliveryChannel
  status?: NotificationDeliveryStatus
  scheduled_at?: string
  delivered_at?: string | null
  payload?: Json
  error_message?: string | null
  created_at?: string
  updated_at?: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
        Relationships: []
      }
      notes: {
        Row: Note
        Insert: NoteInsert
        Update: NoteUpdate
        Relationships: []
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
        Relationships: []
      }
      pomodoro_sessions: {
        Row: PomodoroSession
        Insert: PomodoroSessionInsert
        Update: PomodoroSessionUpdate
        Relationships: []
      }
      reminders: {
        Row: Reminder
        Insert: ReminderInsert
        Update: ReminderUpdate
        Relationships: []
      }
      push_subscriptions: {
        Row: PushSubscription
        Insert: PushSubscriptionInsert
        Update: PushSubscriptionUpdate
        Relationships: []
      }
      notification_deliveries: {
        Row: NotificationDelivery
        Insert: NotificationDeliveryInsert
        Update: NotificationDeliveryUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      update_updated_at_column: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      task_status: TaskStatus
      task_priority: TaskPriority
      pomodoro_type: PomodoroType
    }
  }
}
