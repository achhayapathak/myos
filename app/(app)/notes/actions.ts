"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Note, NoteUpdate } from "@/types/database"
import {
  createNoteSchema,
  updateNoteSchema,
  searchNotesSchema,
} from "@/lib/notes/validations"
import { deriveNoteTitle } from "@/lib/notes/utils"

export interface NoteActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action to create a new note.
 * Derives user ID strictly from the authenticated session.
 */
export async function createNote(
  rawInput?: unknown
): Promise<NoteActionResponse<Note>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = createNoteSchema.safeParse(rawInput || {})
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid note data."
    return { success: false, error: firstError }
  }

  const { title: rawTitle, content } = parseResult.data
  const title = rawTitle || deriveNoteTitle(content, "Untitled Note")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id, // Enforce authenticated identity
      title,
      content,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/notes")
  revalidatePath("/today")

  return { success: true, data }
}

/**
 * Server Action to update an existing note.
 * Scoped strictly to the authenticated user's ownership.
 */
export async function updateNote(
  rawInput: unknown
): Promise<NoteActionResponse<Note>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = updateNoteSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid note update data."
    return { success: false, error: firstError }
  }

  const { id, title, content } = parseResult.data

  const updatePayload: NoteUpdate = {
    updated_at: new Date().toISOString(),
  }
  if (title !== undefined) updatePayload.title = title
  if (content !== undefined) updatePayload.content = content

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notes")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id) // Multi-user authorization constraint
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/notes")
  revalidatePath("/today")

  return { success: true, data }
}

/**
 * Server Action to delete a note.
 */
export async function deleteNote(
  noteId: string
): Promise<NoteActionResponse<void>> {
  if (!noteId || typeof noteId !== "string") {
    return { success: false, error: "Note ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/notes")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to search notes server-side.
 */
export async function searchNotes(
  rawQuery: unknown
): Promise<NoteActionResponse<Note[]>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = searchNotesSchema.safeParse({ query: rawQuery })
  const query = parseResult.success ? parseResult.data.query : ""

  const supabase = await createClient()

  let request = supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (query) {
    request = request.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
  }

  const { data, error } = await request

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}
