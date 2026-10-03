"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Reminder } from "@/types/database"
import {
  createReminderSchema,
  updateReminderSchema,
  deleteReminderSchema,
  toggleReminderCompletedSchema,
  reminderFormInputSchema,
} from "@/lib/reminders/validations"
import { localToUtc, resolveTimeZone } from "@/lib/calendar/timezone-utils"
import {
  queueReminderNotification,
  cancelReminderNotification,
  rescheduleReminderNotification,
} from "@/lib/notifications/delivery"

export interface ReminderActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Normalizes input which can be either direct UTC remind_at or form date/time strings.
 */
function normalizeReminderInput(
  rawInput: unknown,
  fallbackTimeZone = "Asia/Kolkata"
): {
  id?: string
  title: string
  remind_at: string
  completed?: boolean
} {
  // Check direct UTC schema
  const directResult = createReminderSchema.safeParse(rawInput)
  if (directResult.success) {
    const rawObj = rawInput as Record<string, unknown>
    return {
      id: typeof rawObj.id === "string" ? rawObj.id : undefined,
      title: directResult.data.title,
      remind_at: directResult.data.remind_at,
      completed: typeof rawObj.completed === "boolean" ? rawObj.completed : undefined,
    }
  }

  // Parse form input
  const formResult = reminderFormInputSchema.safeParse(rawInput)
  if (!formResult.success) {
    const firstIssue = formResult.error.issues[0]?.message || "Invalid reminder input."
    throw new Error(firstIssue)
  }

  const { id, title, scheduledDate, scheduledTime, timeZone } = formResult.data
  const safeTz = resolveTimeZone(timeZone || fallbackTimeZone)
  const remind_at = localToUtc(scheduledDate, scheduledTime, safeTz)

  return {
    id,
    title,
    remind_at,
  }
}

/**
 * Creates a new reminder.
 * Stores remind_at in UTC in PostgreSQL and hooks into notification delivery abstraction.
 */
export async function createReminder(
  rawInput: unknown
): Promise<ReminderActionResponse<Reminder>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  let payload: ReturnType<typeof normalizeReminderInput>
  try {
    payload = normalizeReminderInput(rawInput)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Validation failed.",
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: user.id, // Strictly user authenticated
      title: payload.title,
      remind_at: payload.remind_at,
      completed: false,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to create reminder.",
    }
  }

  const savedReminder = data as Reminder

  // Enqueue notification delivery abstraction (independent of reminder success)
  try {
    await queueReminderNotification(supabase, {
      userId: user.id,
      reminderId: savedReminder.id,
      title: savedReminder.title,
      scheduledAtUtc: savedReminder.remind_at,
    })
  } catch {
    // Non-blocking: reminder functions independently of delivery infrastructure
  }

  revalidatePath("/reminders")
  revalidatePath("/today")

  return {
    success: true,
    data: savedReminder,
  }
}

/**
 * Updates an existing reminder.
 * Enforces ownership: only modifies where id = reminderId AND user_id = auth.uid().
 */
export async function updateReminder(
  id: string,
  rawInput: unknown
): Promise<ReminderActionResponse<Reminder>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const idResult = deleteReminderSchema.safeParse({ id })
  if (!idResult.success) {
    return { success: false, error: "Invalid reminder ID format." }
  }

  let payload: ReturnType<typeof normalizeReminderInput>
  try {
    payload = normalizeReminderInput(rawInput)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Validation failed.",
    }
  }

  const updateValidation = updateReminderSchema.safeParse({
    id,
    title: payload.title,
    remind_at: payload.remind_at,
    completed: payload.completed,
  })

  if (!updateValidation.success) {
    return {
      success: false,
      error: updateValidation.error.issues[0]?.message || "Validation failed.",
    }
  }

  const supabase = await createClient()

  const updateData: { title: string; remind_at: string; completed?: boolean } = {
    title: payload.title,
    remind_at: payload.remind_at,
  }
  if (payload.completed !== undefined) {
    updateData.completed = payload.completed
  }

  const { data, error } = await supabase
    .from("reminders")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Reminder not found or unauthorized.",
    }
  }

  const updatedReminder = data as Reminder

  // Reschedule notification delivery
  try {
    if (updatedReminder.completed) {
      await cancelReminderNotification(supabase, id, user.id)
    } else {
      await rescheduleReminderNotification(supabase, id, user.id, updatedReminder.remind_at)
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/reminders")
  revalidatePath("/today")

  return {
    success: true,
    data: updatedReminder,
  }
}

/**
 * Toggles a reminder's completion status.
 */
export async function toggleReminderCompleted(
  id: string,
  completed: boolean
): Promise<ReminderActionResponse<Reminder>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = toggleReminderCompletedSchema.safeParse({ id, completed })
  if (!parseResult.success) {
    return { success: false, error: "Invalid completion input." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reminders")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to update reminder status.",
    }
  }

  const updatedReminder = data as Reminder

  // Sync notification delivery state
  try {
    if (completed) {
      await cancelReminderNotification(supabase, id, user.id)
    } else if (new Date(updatedReminder.remind_at).getTime() > Date.now()) {
      await queueReminderNotification(supabase, {
        userId: user.id,
        reminderId: updatedReminder.id,
        title: updatedReminder.title,
        scheduledAtUtc: updatedReminder.remind_at,
      })
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/reminders")
  revalidatePath("/today")

  return {
    success: true,
    data: updatedReminder,
  }
}

/**
 * Deletes a reminder.
 * Enforces ownership: only deletes where id = reminderId AND user_id = auth.uid().
 */
export async function deleteReminder(
  id: string
): Promise<ReminderActionResponse<boolean>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const idResult = deleteReminderSchema.safeParse({ id })
  if (!idResult.success) {
    return { success: false, error: "Invalid reminder ID format." }
  }

  const supabase = await createClient()

  const { error, count } = await supabase
    .from("reminders")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to delete reminder.",
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: "Reminder not found or unauthorized to delete.",
    }
  }

  // Cancel any lingering notification delivery
  try {
    await cancelReminderNotification(supabase, id, user.id)
  } catch {
    // Non-blocking
  }

  revalidatePath("/reminders")
  revalidatePath("/today")

  return {
    success: true,
    data: true,
  }
}
