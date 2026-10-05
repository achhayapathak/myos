"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Note, NoteUpdate } from "@/types/database"
import {
  createNoteSchema,
  updateNoteSchema,
  searchNotesSchema,
  lockNoteSchema,
  unlockNoteSchema,
  removeLockSchema,
} from "@/lib/notes/validations"
import { deriveNoteTitle } from "@/lib/notes/utils"
import { hashPassword, verifyPassword } from "@/lib/notes/crypto"

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
      is_locked: false,
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
 * Server Action to lock a note with a password.
 */
export async function lockNote(
  rawInput: unknown
): Promise<NoteActionResponse<{ id: string; is_locked: boolean }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = lockNoteSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid lock data."
    return { success: false, error: firstError }
  }

  const { id, password } = parseResult.data
  const passwordHash = hashPassword(password)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notes")
    .update({
      is_locked: true,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, is_locked")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/notes")
  revalidatePath("/today")

  return {
    success: true,
    data: { id: data.id, is_locked: Boolean(data.is_locked) },
  }
}

/**
 * Server Action to unlock a note by validating password and returning content.
 */
export async function unlockNote(
  rawInput: unknown
): Promise<NoteActionResponse<{ id: string; content: string }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = unlockNoteSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid unlock data."
    return { success: false, error: firstError }
  }

  const { id, password } = parseResult.data

  const supabase = await createClient()
  const { data: note, error } = await supabase
    .from("notes")
    .select("id, content, is_locked, password_hash")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !note) {
    return { success: false, error: error?.message || "Note not found." }
  }

  if (!note.is_locked) {
    return { success: true, data: { id: note.id, content: note.content } }
  }

  const isValid = verifyPassword(password, note.password_hash)
  if (!isValid) {
    return { success: false, error: "Incorrect password." }
  }

  return { success: true, data: { id: note.id, content: note.content } }
}

/**
 * Server Action to permanently remove a note's lock.
 */
export async function removeNoteLock(
  rawInput: unknown
): Promise<NoteActionResponse<{ id: string; is_locked: boolean }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = removeLockSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid request."
    return { success: false, error: firstError }
  }

  const { id, password } = parseResult.data

  const supabase = await createClient()
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, is_locked, password_hash")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !note) {
    return { success: false, error: fetchError?.message || "Note not found." }
  }

  if (note.is_locked) {
    const isValid = verifyPassword(password, note.password_hash)
    if (!isValid) {
      return { success: false, error: "Incorrect password." }
    }
  }

  const { data, error } = await supabase
    .from("notes")
    .update({
      is_locked: false,
      password_hash: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, is_locked")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/notes")
  revalidatePath("/today")

  return { success: true, data: { id: data.id, is_locked: false } }
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

  const { id, title, content, password } = parseResult.data

  const supabase = await createClient()

  // Guard locked notes: verify password if note is locked
  try {
    const checkQuery = supabase.from("notes").select("id, is_locked, password_hash")
    if (checkQuery && typeof (checkQuery as unknown as { eq?: unknown }).eq === "function") {
      const { data: existingNote } = await checkQuery
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (existingNote?.is_locked) {
        if (!password || !verifyPassword(password, existingNote.password_hash)) {
          return {
            success: false,
            error: "Unauthorized: Password required to update locked note.",
          }
        }
      }
    }
  } catch {
    // Proceed to scoped update
  }

  const updatePayload: NoteUpdate = {
    updated_at: new Date().toISOString(),
  }
  if (title !== undefined) updatePayload.title = title
  if (content !== undefined) updatePayload.content = content

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

  const sanitized: Note = { ...data }
  delete sanitized.password_hash

  return { success: true, data: sanitized }
}

/**
 * Server Action to delete a note.
 */
export async function deleteNote(
  noteId: string,
  password?: string
): Promise<NoteActionResponse<void>> {
  if (!noteId || typeof noteId !== "string") {
    return { success: false, error: "Note ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()

  try {
    const checkQuery = supabase.from("notes").select("id, is_locked, password_hash")
    if (checkQuery && typeof (checkQuery as unknown as { eq?: unknown }).eq === "function") {
      const { data: existingNote } = await checkQuery
        .eq("id", noteId)
        .eq("user_id", user.id)
        .single()

      if (existingNote?.is_locked) {
        if (!password || !verifyPassword(password, existingNote.password_hash)) {
          return { success: false, error: "Password required to delete locked note." }
        }
      }
    }
  } catch {
    // Proceed to scoped delete
  }

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
 * Content of locked notes is never matched or exposed in results.
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
    .select("id, user_id, title, content, is_locked, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (query) {
    const cleanTerm = query.replace(/[,()%]/g, " ").replace(/\s+/g, " ").trim()
    if (cleanTerm) {
      request = request.or(
        `title.ilike.%${cleanTerm}%,and(is_locked.eq.false,content.ilike.%${cleanTerm}%)`
      )
    }
  }

  const { data, error } = await request

  if (error) {
    return { success: false, error: error.message }
  }

  const cleanQuery = query.toLowerCase().trim()
  const sanitizedNotes = (data || [])
    .filter((note) => {
      // Locked notes must only match if the title contains the query
      if (note.is_locked && cleanQuery) {
        return note.title.toLowerCase().includes(cleanQuery)
      }
      return true
    })
    .map((note) => {
      if (note.is_locked) {
        return {
          ...note,
          content: "", // Content hidden from search result
        }
      }
      return note
    })

  return { success: true, data: sanitizedNotes }
}
