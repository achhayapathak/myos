"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Habit } from "@/types/database"
import {
  createHabitSchema,
  quickCreateHabitSchema,
  updateHabitSchema,
  toggleHabitArchiveSchema,
  deleteHabitSchema,
  toggleHabitCompletionSchema,
} from "@/lib/habits/validation"
import type { HabitActionResponse } from "@/lib/habits/types"

/**
 * Creates a new habit.
 * Strictly verifies authenticated user session and never trusts client user_id.
 */
export async function createHabit(
  rawInput: unknown
): Promise<HabitActionResponse<Habit>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = createHabitSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]?.message || "Validation failed."
    return { success: false, error: firstIssue }
  }

  const { name, description, frequency_type, target_days, color } = parseResult.data

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id, // Strictly user authenticated
      name,
      description: description || null,
      frequency_type,
      target_days: frequency_type === "weekly" ? target_days ?? null : null,
      color: color || null,
      archived: false,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to create habit.",
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: data as Habit,
  }
}

/**
 * Quick-creates a basic daily habit from just a name.
 * Ideal for rapid inline entry on the Today dashboard.
 */
export async function quickCreateHabit(
  rawInput: unknown
): Promise<HabitActionResponse<Habit>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = quickCreateHabitSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]?.message || "Validation failed."
    return { success: false, error: firstIssue }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      name: parseResult.data.name,
      description: null,
      frequency_type: "daily",
      target_days: null,
      archived: false,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to create habit.",
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: data as Habit,
  }
}

/**
 * Updates an existing habit.
 * Strictly scopes update to habit ID AND session user_id.
 */
export async function updateHabit(
  id: string,
  rawInput: unknown
): Promise<HabitActionResponse<Habit>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = updateHabitSchema.safeParse({
    ...(typeof rawInput === "object" && rawInput !== null ? rawInput : {}),
    id,
  })

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]?.message || "Validation failed."
    return { success: false, error: firstIssue }
  }

  const { name, description, frequency_type, target_days, color, archived } =
    parseResult.data

  const supabase = await createClient()

  const updatePayload: {
    name: string
    description: string | null
    frequency_type: "daily" | "weekly"
    target_days: number[] | null
    color: string | null
    archived?: boolean
  } = {
    name,
    description: description || null,
    frequency_type,
    target_days: frequency_type === "weekly" ? target_days ?? null : null,
    color: color || null,
  }

  if (archived !== undefined) {
    updatePayload.archived = archived
  }

  const { data, error } = await supabase
    .from("habits")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Habit not found or unauthorized.",
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: data as Habit,
  }
}

/**
 * Toggles a habit's archived status.
 * Preserves all historical completion data.
 */
export async function toggleHabitArchive(
  id: string,
  archived: boolean
): Promise<HabitActionResponse<Habit>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = toggleHabitArchiveSchema.safeParse({ id, archived })
  if (!parseResult.success) {
    return { success: false, error: "Invalid archive parameters." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("habits")
    .update({ archived })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Habit not found or unauthorized.",
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: data as Habit,
  }
}

/**
 * Permanently deletes a habit.
 * Cascades to delete habit_completions via database FK.
 */
export async function deleteHabit(
  id: string
): Promise<HabitActionResponse<boolean>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = deleteHabitSchema.safeParse({ id })
  if (!parseResult.success) {
    return { success: false, error: "Invalid habit ID format." }
  }

  const supabase = await createClient()

  const { error, count } = await supabase
    .from("habits")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to delete habit.",
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: "Habit not found or unauthorized to delete.",
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: true,
  }
}

/**
 * Toggles a habit's completion status for a given calendar date.
 * Idempotent: If completed record exists, duplicate insert is avoided.
 * Defense-in-depth: verifies both habit ownership and user_id session.
 */
export async function toggleHabitCompletion(
  habitId: string,
  completedOn: string,
  completed: boolean
): Promise<HabitActionResponse<{ completed: boolean; completedOn: string }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = toggleHabitCompletionSchema.safeParse({
    habitId,
    completedOn,
    completed,
  })

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]?.message || "Invalid completion input."
    return { success: false, error: firstIssue }
  }

  const supabase = await createClient()

  // Defense-in-depth: Verify habit belongs to authenticated user
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return {
      success: false,
      error: "Habit not found or unauthorized.",
    }
  }

  if (completed) {
    // Idempotent completion creation: check existing or upsert with ignoreDuplicates
    const { error: insertError } = await supabase
      .from("habit_completions")
      .upsert(
        {
          habit_id: habitId,
          user_id: user.id,
          completed_on: completedOn,
        },
        {
          onConflict: "habit_id,completed_on",
          ignoreDuplicates: true,
        }
      )

    if (insertError) {
      return {
        success: false,
        error: insertError.message || "Failed to complete habit.",
      }
    }
  } else {
    // Undo completion: delete completion record
    const { error: deleteError } = await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_on", completedOn)
      .eq("user_id", user.id)

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message || "Failed to undo habit completion.",
      }
    }
  }

  revalidatePath("/habits")
  revalidatePath("/today")

  return {
    success: true,
    data: { completed, completedOn },
  }
}
