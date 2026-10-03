"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { PomodoroType } from "@/types/database"
import { notificationService } from "@/lib/notifications/service"

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Valid subscription endpoint URL required."),
  keys: z.object({
    p256dh: z.string().min(10, "Valid p256dh key required."),
    auth: z.string().min(6, "Valid auth key required."),
  }),
})

export interface PushActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Stores a push subscription for the authenticated user.
 * Supports multiple devices per user.
 */
export async function savePushSubscription(
  rawInput: unknown
): Promise<PushActionResponse<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = pushSubscriptionSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const message = parseResult.error.issues[0]?.message || "Invalid push subscription data."
    return { success: false, error: message }
  }

  const { endpoint, keys } = parseResult.data
  const supabase = await createClient()

  // Upsert subscription into push_subscriptions table
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,endpoint",
      }
    )
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/settings")
  return { success: true, data: { id: data.id } }
}

/**
 * Revokes a specific device push subscription.
 */
export async function revokePushSubscription(
  endpoint: string
): Promise<PushActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  if (!endpoint || typeof endpoint !== "string") {
    return { success: false, error: "Invalid endpoint provided." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

/**
 * Revokes all device push subscriptions for the user.
 */
export async function revokeAllPushSubscriptions(): Promise<PushActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

/**
 * Retrieves the number of registered push devices for the user.
 */
export async function getPushSubscriptionCount(): Promise<PushActionResponse<{ count: number }>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: { count: count ?? 0 } }
}

/**
 * Sends a test Web Push notification to verify delivery across devices.
 */
export async function sendTestNotificationAction(): Promise<
  PushActionResponse<{ sentCount: number; totalCount: number }>
> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const result = await notificationService.sendNotificationToUser(supabase, user.id, {
    title: "MyOS Notifications Active",
    body: "Your device is connected and ready to receive reminders and focus alerts.",
    url: "/today",
    tag: "test-notification",
  })

  if (!result.success && result.totalSubscriptions === 0) {
    return {
      success: false,
      error: "No active push subscriptions found. Please enable notifications on this device first.",
    }
  }

  return {
    success: result.success,
    data: {
      sentCount: result.sentCount,
      totalCount: result.totalSubscriptions,
    },
    error: result.error,
  }
}

/**
 * Dispatches Pomodoro session completion push notification.
 */
export async function sendPomodoroPushAction(
  type: PomodoroType,
  taskTitle?: string | null
): Promise<PushActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  await notificationService.sendPomodoroPush(supabase, user.id, {
    type,
    taskTitle,
  })

  return { success: true }
}

/**
 * Dispatches a reminder push notification.
 */
export async function sendReminderPushAction(
  reminderId: string
): Promise<PushActionResponse<void>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()

  // Fetch reminder details
  const { data: reminder, error } = await supabase
    .from("reminders")
    .select("id, title, remind_at")
    .eq("id", reminderId)
    .eq("user_id", user.id)
    .single()

  if (error || !reminder) {
    return { success: false, error: "Reminder not found." }
  }

  await notificationService.sendReminderPush(supabase, user.id, {
    reminderId: reminder.id,
    title: reminder.title,
    scheduledAt: reminder.remind_at,
  })

  return { success: true }
}
