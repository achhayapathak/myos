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

export interface Profile {
  id: string
  user_id: string
  display_name: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id?: string
  user_id: string
  display_name?: string | null
  timezone?: string
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  user_id?: string
  display_name?: string | null
  timezone?: string
  created_at?: string
  updated_at?: string
}

export interface Task {
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

export interface TaskInsert {
  id?: string
  user_id: string
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_at?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface TaskUpdate {
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

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface NoteInsert {
  id?: string
  user_id: string
  title: string
  content?: string
  created_at?: string
  updated_at?: string
}

export interface NoteUpdate {
  id?: string
  user_id?: string
  title?: string
  content?: string
  created_at?: string
  updated_at?: string
}

export interface Event {
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

export interface EventInsert {
  id?: string
  user_id: string
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  all_day?: boolean
  created_at?: string
  updated_at?: string
}

export interface EventUpdate {
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

export interface PomodoroSession {
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

export interface PomodoroSessionInsert {
  id?: string
  user_id: string
  type: PomodoroType
  duration_seconds: number
  started_at?: string
  ended_at?: string | null
  task_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface PomodoroSessionUpdate {
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

export interface Reminder {
  id: string
  user_id: string
  title: string
  remind_at: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface ReminderInsert {
  id?: string
  user_id: string
  title: string
  remind_at: string
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface ReminderUpdate {
  id?: string
  user_id?: string
  title?: string
  remind_at?: string
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  updated_at: string
}

export interface PushSubscriptionInsert {
  id?: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at?: string
  updated_at?: string
}

export interface PushSubscriptionUpdate {
  id?: string
  user_id?: string
  endpoint?: string
  p256dh?: string
  auth?: string
  created_at?: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
      }
      notes: {
        Row: Note
        Insert: NoteInsert
        Update: NoteUpdate
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
      }
      pomodoro_sessions: {
        Row: PomodoroSession
        Insert: PomodoroSessionInsert
        Update: PomodoroSessionUpdate
      }
      reminders: {
        Row: Reminder
        Insert: ReminderInsert
        Update: ReminderUpdate
      }
      push_subscriptions: {
        Row: PushSubscription
        Insert: PushSubscriptionInsert
        Update: PushSubscriptionUpdate
      }
    }
    Views: Record<string, never>
    Functions: {
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
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
