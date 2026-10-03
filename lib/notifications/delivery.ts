import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, NotificationDelivery, Json } from "@/types/database"

export interface QueueNotificationParams {
  userId: string
  reminderId: string
  title: string
  scheduledAtUtc: string
  body?: string | null
  url?: string | null
  channel?: "web_push" | "in_app"
}

export interface DeliveryActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Database abstraction for Web Push notification delivery.
 * Separates notification scheduling/outbox storage from the core domain entities.
 * Note: Does NOT implement fake in-memory schedulers; records are persisted
 * for pickup by background workers / edge functions.
 */
export async function queueReminderNotification(
  supabase: SupabaseClient<Database>,
  params: QueueNotificationParams
): Promise<DeliveryActionResult<NotificationDelivery>> {
  try {
    const payload: Json = {
      title: params.title,
      body: params.body || `Reminder: ${params.title}`,
      url: params.url || "/reminders",
      reminderId: params.reminderId,
    }

    // Cancel any previous pending delivery for this reminder to avoid duplicates
    await supabase
      .from("notification_deliveries")
      .update({ status: "cancelled" })
      .eq("reminder_id", params.reminderId)
      .eq("user_id", params.userId)
      .eq("status", "pending")

    // Insert new pending delivery
    const { data, error } = await supabase
      .from("notification_deliveries")
      .insert({
        user_id: params.userId,
        reminder_id: params.reminderId,
        channel: params.channel || "web_push",
        status: "pending",
        scheduled_at: params.scheduledAtUtc,
        payload,
      })
      .select()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Failed to queue notification delivery.",
      }
    }

    return {
      success: true,
      data: data as NotificationDelivery,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error queuing notification.",
    }
  }
}

/**
 * Cancels any pending notification deliveries for a reminder (e.g. when completed or deleted).
 */
export async function cancelReminderNotification(
  supabase: SupabaseClient<Database>,
  reminderId: string,
  userId: string
): Promise<DeliveryActionResult<number>> {
  try {
    const { error, count } = await supabase
      .from("notification_deliveries")
      .update({ status: "cancelled" }, { count: "exact" })
      .eq("reminder_id", reminderId)
      .eq("user_id", userId)
      .eq("status", "pending")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: count ?? 0 }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel notification delivery.",
    }
  }
}

/**
 * Reschedules a pending notification delivery to a new UTC timestamp.
 */
export async function rescheduleReminderNotification(
  supabase: SupabaseClient<Database>,
  reminderId: string,
  userId: string,
  newScheduledAtUtc: string
): Promise<DeliveryActionResult<boolean>> {
  try {
    const { error } = await supabase
      .from("notification_deliveries")
      .update({ scheduled_at: newScheduledAtUtc })
      .eq("reminder_id", reminderId)
      .eq("user_id", userId)
      .eq("status", "pending")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reschedule notification delivery.",
    }
  }
}

/**
 * Queries pending deliveries due before cutoff for future worker processing.
 */
export async function getPendingDeliveries(
  supabase: SupabaseClient<Database>,
  cutoffUtc = new Date().toISOString()
): Promise<NotificationDelivery[]> {
  const { data } = await supabase
    .from("notification_deliveries")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", cutoffUtc)
    .order("scheduled_at", { ascending: true })

  return (data as NotificationDelivery[]) ?? []
}
