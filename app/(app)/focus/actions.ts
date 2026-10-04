"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { PomodoroSession, PomodoroSessionUpdate } from "@/types/database"
import {
  startSessionSchema,
  completeSessionSchema,
  cancelSessionSchema,
  pauseSessionSchema,
  resumeSessionSchema,
} from "@/lib/focus/validations"
import { calculateResumeStartedAt } from "@/lib/focus/timer-utils"
import { notificationService } from "@/lib/notifications/service"

export interface PomodoroActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action to start a new Pomodoro session.
 * Stores started_at, duration_seconds, and ended_at (null initially).
 * Closes any previous unended sessions for this user.
 */
export async function startPomodoroSession(
  rawInput: unknown
): Promise<PomodoroActionResponse<PomodoroSession>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = startSessionSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid session input."
    return { success: false, error: firstError }
  }

  const { type, duration_seconds, task_id } = parseResult.data
  const supabase = await createClient()

  // Validate task ownership if associated
  if (task_id) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", task_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!task) {
      return { success: false, error: "Task not found or unauthorized." }
    }
  }

  const nowIso = new Date().toISOString()

  // 1. Close any existing active sessions for this user first
  await supabase
    .from("pomodoro_sessions")
    .update({ ended_at: nowIso })
    .eq("user_id", user.id)
    .is("ended_at", null)

  // 2. Insert new session
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .insert({
      user_id: user.id, // Strictly user authenticated
      type,
      duration_seconds,
      started_at: nowIso,
      ended_at: null, // Active
      task_id,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true, data }
}

/**
 * Server Action to persist a completed session.
 * Stores ended_at timestamp.
 */
export async function completePomodoroSession(
  rawInput: unknown
): Promise<PomodoroActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = completeSessionSchema.safeParse(
    typeof rawInput === "string" ? { id: rawInput } : rawInput
  )
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid session ID."
    return { success: false, error: firstError }
  }

  const { id, ended_at } = parseResult.data
  const endedAtIso = ended_at || new Date().toISOString()

  const supabase = await createClient()
  const { data: sessionData, error } = await supabase
    .from("pomodoro_sessions")
    .update({
      ended_at: endedAtIso,
    })
    .eq("id", id)
    .eq("user_id", user.id) // Multi-user authorization constraint
    .select("type, task_id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Best-effort push notification delivery to user's registered devices
  if (sessionData) {
    try {
      let taskTitle: string | null = null
      if (sessionData.task_id) {
        const { data: task } = await supabase
          .from("tasks")
          .select("title")
          .eq("id", sessionData.task_id)
          .single()
        taskTitle = task?.title || null
      }

      await notificationService.sendPomodoroPush(supabase, user.id, {
        type: sessionData.type,
        taskTitle,
      })
    } catch {
      // Non-blocking: session completion succeeds independently of push delivery
    }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to cancel or delete an uncompleted session.
 */
export async function cancelPomodoroSession(
  rawInput: unknown
): Promise<PomodoroActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = cancelSessionSchema.safeParse(
    typeof rawInput === "string" ? { id: rawInput } : rawInput
  )
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid session ID."
    return { success: false, error: firstError }
  }

  const { id } = parseResult.data

  const supabase = await createClient()
  const { error } = await supabase
    .from("pomodoro_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to associate or disassociate a task with an active session.
 */
export async function associateTaskWithSession(
  sessionId: string,
  taskId: string | null
): Promise<PomodoroActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()

  // Validate task ownership if associating a task
  if (taskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!task) {
      return { success: false, error: "Task not found or unauthorized." }
    }
  }

  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({
      task_id: taskId,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to pause an ongoing Pomodoro session.
 * Stores paused_at timestamp.
 */
export async function pausePomodoroSession(
  rawInput: unknown
): Promise<PomodoroActionResponse<PomodoroSession>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = pauseSessionSchema.safeParse(
    typeof rawInput === "string" ? { id: rawInput } : rawInput
  )
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid session ID."
    return { success: false, error: firstError }
  }

  const { id } = parseResult.data
  const nowIso = new Date().toISOString()
  const supabase = await createClient()

  // Attempt updating paused_at
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .update({ paused_at: nowIso })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("ended_at", null)
    .select()
    .single()

  if (error) {
    // If paused_at column does not exist on legacy schema, fetch session without failing
    const { data: fallbackData } = await supabase
      .from("pomodoro_sessions")
      .select()
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (fallbackData) {
      return { success: true, data: fallbackData as PomodoroSession }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true, data: data as PomodoroSession }
}

/**
 * Server Action to resume a paused Pomodoro session.
 * Adjusts started_at so that exactly the remaining seconds are preserved,
 * and clears the paused_at timestamp.
 */
export async function resumePomodoroSession(
  rawInput: unknown
): Promise<PomodoroActionResponse<PomodoroSession>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = resumeSessionSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid resume input."
    return { success: false, error: firstError }
  }

  const { id, remaining_seconds } = parseResult.data
  const supabase = await createClient()

  // Fetch session to obtain its duration
  const { data: session, error: fetchError } = await supabase
    .from("pomodoro_sessions")
    .select()
    .eq("id", id)
    .eq("user_id", user.id)
    .is("ended_at", null)
    .single()

  if (fetchError || !session) {
    return { success: false, error: "Session not found or already ended." }
  }

  const newStartedAt = calculateResumeStartedAt(session.duration_seconds, remaining_seconds)

  // Try updating with paused_at cleared
  const updatePayload: PomodoroSessionUpdate = {
    started_at: newStartedAt,
    paused_at: null,
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("pomodoro_sessions")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (updateError) {
    // If paused_at column does not exist on legacy schema, retry without it
    const { data: fallbackSession, error: fallbackError } = await supabase
      .from("pomodoro_sessions")
      .update({ started_at: newStartedAt })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (fallbackError) {
      return { success: false, error: fallbackError.message }
    }

    revalidatePath("/focus")
    revalidatePath("/today")
    return { success: true, data: fallbackSession as PomodoroSession }
  }

  revalidatePath("/focus")
  revalidatePath("/today")

  return { success: true, data: updatedSession as PomodoroSession }
}
