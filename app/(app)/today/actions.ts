"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { TaskPriority, TaskStatus } from "@/types/database"
import { getTodayDateBounds } from "@/lib/today-utils"

export interface ActionResponse {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Server Action to quickly create a task from the Today dashboard.
 * User ID is strictly derived from the authenticated session.
 */
export async function createQuickTask(formData: FormData): Promise<ActionResponse> {
  const title = (formData.get("title") as string)?.trim()
  const priorityRaw = (formData.get("priority") as string)?.trim() || "medium"
  const dueToday = formData.get("dueToday") === "true" || formData.get("dueToday") === "on"

  if (!title) {
    return { error: "Task title cannot be empty." }
  }

  if (title.length > 255) {
    return { error: "Task title must be 255 characters or fewer." }
  }

  const validPriorities: TaskPriority[] = ["low", "medium", "high"]
  const priority: TaskPriority = validPriorities.includes(priorityRaw as TaskPriority)
    ? (priorityRaw as TaskPriority)
    : "medium"

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized: Active session required." }
  }

  // Determine due_at timestamp
  let dueAt: string | null = null
  if (dueToday) {
    // Look up user profile timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle()

    const timeZone = profile?.timezone || "Asia/Kolkata"
    const bounds = getTodayDateBounds(timeZone)
    // Default due time to end of day today
    dueAt = bounds.endISO
  }

  const { error: insertError } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    priority,
    status: "todo",
    due_at: dueAt,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath("/today")
  revalidatePath("/tasks")

  return { success: true }
}

/**
 * Server Action to quickly create a markdown note or scratchpad thought.
 */
export async function createQuickNote(formData: FormData): Promise<ActionResponse> {
  const content = (formData.get("content") as string)?.trim()
  const rawTitle = (formData.get("title") as string)?.trim()

  if (!content) {
    return { error: "Note content cannot be empty." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized: Active session required." }
  }

  // Derive title if empty: first line or default fallback
  let title = rawTitle
  if (!title) {
    const firstLine = content.split("\n")[0].replace(/^[#*\s-]+/, "").trim()
    title = firstLine.length > 0 ? firstLine.slice(0, 50) : "Quick Note"
  }

  const { error: insertError } = await supabase.from("notes").insert({
    user_id: user.id,
    title,
    content,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath("/today")
  revalidatePath("/notes")

  return { success: true, message: "Note saved." }
}

/**
 * Server Action to toggle a task's status between completed and pending.
 */
export async function toggleTaskStatus(
  taskId: string,
  currentStatus: TaskStatus
): Promise<ActionResponse> {
  if (!taskId) {
    return { error: "Task ID is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized: Active session required." }
  }

  const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed"
  const completedAt = nextStatus === "completed" ? new Date().toISOString() : null

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      completed_at: completedAt,
    })
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/today")
  revalidatePath("/tasks")

  return { success: true }
}
