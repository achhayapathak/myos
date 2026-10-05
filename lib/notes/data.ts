import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Note } from "@/types/database"

export interface NotesPageData {
  user: {
    id: string
    displayName: string | null
    email: string | null
  }
  notes: Note[]
}

/**
 * Server-only data fetcher for Notes.
 * Strictly verifies authenticated user session and enforces Row Level Security.
 */
export async function getNotesPageData(): Promise<NotesPageData | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()

  // Fetch all notes owned by this user, ordered by most recently updated
  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch user notes:", error.message)
    return null
  }

  // Ensure locked note contents and password hashes are never exposed to browser state
  const sanitizedNotes: Note[] = (notes || []).map((note) => ({
    id: note.id,
    user_id: note.user_id,
    title: note.title,
    content: note.is_locked ? "" : note.content,
    is_locked: Boolean(note.is_locked),
    created_at: note.created_at,
    updated_at: note.updated_at,
  }))

  return {
    user: {
      id: user.id,
      displayName: "master",
      email: user.email || null,
    },
    notes: sanitizedNotes,
  }
}

