"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { GlobalSearchResponse, GlobalSearchResults } from "./types"

const searchQuerySchema = z.string().max(100)

/**
 * Server Action: Global search across Tasks, Notes, and Calendar Events.
 *
 * Requirements:
 * - Never trusts client-supplied user_id: authenticated session identity is enforced.
 * - Respects PostgreSQL Row Level Security (RLS).
 * - Uses PostgreSQL search capabilities with trigram index support.
 * - Concurrently queries tasks, notes, and calendar events with limits.
 */
export async function globalSearchAction(
  rawQuery: string
): Promise<GlobalSearchResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = searchQuerySchema.safeParse(rawQuery)
  if (!parseResult.success) {
    return { success: false, error: "Invalid search query." }
  }

  const raw = parseResult.data.trim()
  if (!raw) {
    return {
      success: true,
      data: {
        tasks: [],
        notes: [],
        events: [],
      },
    }
  }

  // Sanitize query to prevent PostgREST URL filter delimiter syntax breaks
  const cleanTerm = raw.replace(/[,()%]/g, " ").replace(/\s+/g, " ").trim()
  if (!cleanTerm) {
    return {
      success: true,
      data: {
        tasks: [],
        notes: [],
        events: [],
      },
    }
  }

  const supabase = await createClient()

  try {
    const [tasksRes, notesRes, eventsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_at, updated_at")
        .eq("user_id", user.id)
        .or(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("notes")
        .select("id, title, content, updated_at")
        .eq("user_id", user.id)
        .or(`title.ilike.%${cleanTerm}%,content.ilike.%${cleanTerm}%`)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("events")
        .select("id, title, description, start_at, end_at, all_day, updated_at")
        .eq("user_id", user.id)
        .or(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`)
        .order("start_at", { ascending: false })
        .limit(8),
    ])

    if (tasksRes.error) {
      return { success: false, error: tasksRes.error.message }
    }
    if (notesRes.error) {
      return { success: false, error: notesRes.error.message }
    }
    if (eventsRes.error) {
      return { success: false, error: eventsRes.error.message }
    }

    const results: GlobalSearchResults = {
      tasks: (tasksRes.data || []) as GlobalSearchResults["tasks"],
      notes: (notesRes.data || []) as GlobalSearchResults["notes"],
      events: (eventsRes.data || []) as GlobalSearchResults["events"],
    }

    return {
      success: true,
      data: results,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed."
    return { success: false, error: message }
  }
}
