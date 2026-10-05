import type { Task } from "@/types/database"

export interface SearchTaskResult {
  id: string
  title: string
  description: string | null
  status: Task["status"]
  priority: Task["priority"]
  due_at: string | null
  updated_at: string
}

export interface SearchNoteResult {
  id: string
  title: string
  content: string
  updated_at: string
  is_locked?: boolean
}

export interface SearchEventResult {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  updated_at: string
}

export interface GlobalSearchResults {
  tasks: SearchTaskResult[]
  notes: SearchNoteResult[]
  events: SearchEventResult[]
}

export interface GlobalSearchResponse {
  success: boolean
  data?: GlobalSearchResults
  error?: string
}
