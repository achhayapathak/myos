"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Event as DbEvent } from "@/types/database"
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  eventFormInputSchema,
} from "@/lib/calendar/validations"
import {
  localToUtc,
  computeAllDayUtcRange,
  resolveTimeZone,
} from "@/lib/calendar/timezone-utils"

export interface CalendarActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Normalizes input which can be either direct UTC timestamps or form date/time values.
 */
function normalizeToUtcPayload(
  rawInput: unknown,
  fallbackTimeZone = "Asia/Kolkata"
): {
  id?: string
  title: string
  description?: string | null
  all_day: boolean
  start_at: string
  end_at: string | null
} {
  // Check if it's already matching direct UTC schema
  const directResult = createEventSchema.safeParse(rawInput)
  if (directResult.success) {
    const rawObj = rawInput as Record<string, unknown>
    return {
      id: typeof rawObj.id === "string" ? rawObj.id : undefined,
      title: directResult.data.title,
      description: directResult.data.description ?? null,
      all_day: directResult.data.all_day,
      start_at: directResult.data.start_at,
      end_at: directResult.data.end_at ?? null,
    }
  }

  // Otherwise parse as form input
  const formResult = eventFormInputSchema.safeParse(rawInput)
  if (!formResult.success) {
    const firstIssue = formResult.error.issues[0]?.message || "Invalid event input."
    throw new Error(firstIssue)
  }

  const data = formResult.data
  const timeZone = resolveTimeZone(data.timeZone || fallbackTimeZone)

  if (data.all_day) {
    const { start_at, end_at } = computeAllDayUtcRange(
      data.startDate,
      data.endDate || data.startDate,
      timeZone
    )
    return {
      id: data.id,
      title: data.title,
      description: data.description ?? null,
      all_day: true,
      start_at,
      end_at,
    }
  }

  // Timed event
  const startTime = data.startTime || "00:00"
  const start_at = localToUtc(data.startDate, startTime, timeZone)

  let end_at: string | null = null
  if (data.endTime) {
    const endDate = data.endDate || data.startDate
    end_at = localToUtc(endDate, data.endTime, timeZone)
    if (new Date(end_at).getTime() < new Date(start_at).getTime()) {
      throw new Error("End time must be after or equal to start time")
    }
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    all_day: false,
    start_at,
    end_at,
  }
}

/**
 * Creates a new calendar event.
 * Timestamps are stored in UTC in PostgreSQL.
 */
export async function createCalendarEvent(
  rawInput: unknown
): Promise<CalendarActionResponse<DbEvent>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  let payload: ReturnType<typeof normalizeToUtcPayload>
  try {
    payload = normalizeToUtcPayload(rawInput)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Validation failed.",
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id, // Authenticated identity
      title: payload.title,
      description: payload.description,
      start_at: payload.start_at,
      end_at: payload.end_at,
      all_day: payload.all_day,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Failed to create calendar event.",
    }
  }

  revalidatePath("/calendar")
  revalidatePath("/today")

  return {
    success: true,
    data: data as DbEvent,
  }
}

/**
 * Updates an existing calendar event.
 * Enforces ownership: only modifies where id = eventId AND user_id = auth.uid().
 */
export async function updateCalendarEvent(
  id: string,
  rawInput: unknown
): Promise<CalendarActionResponse<DbEvent>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  // Validate ID format
  const idResult = deleteEventSchema.safeParse({ id })
  if (!idResult.success) {
    return { success: false, error: "Invalid event ID." }
  }

  let payload: ReturnType<typeof normalizeToUtcPayload>
  try {
    payload = normalizeToUtcPayload(rawInput)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Validation failed.",
    }
  }

  // Double check with updateEventSchema
  const updateValidation = updateEventSchema.safeParse({
    id,
    title: payload.title,
    description: payload.description,
    all_day: payload.all_day,
    start_at: payload.start_at,
    end_at: payload.end_at,
  })

  if (!updateValidation.success) {
    return {
      success: false,
      error: updateValidation.error.issues[0]?.message || "Validation failed.",
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("events")
    .update({
      title: payload.title,
      description: payload.description,
      start_at: payload.start_at,
      end_at: payload.end_at,
      all_day: payload.all_day,
    })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Event not found or unauthorized.",
    }
  }

  revalidatePath("/calendar")
  revalidatePath("/today")

  return {
    success: true,
    data: data as DbEvent,
  }
}

/**
 * Deletes a calendar event.
 * Enforces ownership: only deletes where id = eventId AND user_id = auth.uid().
 */
export async function deleteCalendarEvent(
  id: string
): Promise<CalendarActionResponse<boolean>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const idResult = deleteEventSchema.safeParse({ id })
  if (!idResult.success) {
    return { success: false, error: "Invalid event ID format." }
  }

  const supabase = await createClient()

  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id) // Enforce ownership

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to delete calendar event.",
    }
  }

  if (count === 0) {
    return {
      success: false,
      error: "Event not found or unauthorized to delete.",
    }
  }

  revalidatePath("/calendar")
  revalidatePath("/today")

  return {
    success: true,
    data: true,
  }
}
