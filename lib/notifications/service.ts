import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, PomodoroType } from "@/types/database"
import type {
  NotificationPayload,
  NotificationProvider,
  UserNotificationBatchResult,
  NotificationSendResult,
} from "./types"
import { defaultWebPushProvider } from "./web-push-provider"

export interface ReminderPushParams {
  reminderId: string
  title: string
  scheduledAt?: string
  body?: string
}

export interface PomodoroPushParams {
  type: PomodoroType
  taskTitle?: string | null
}

export interface HabitPushParams {
  habitId: string
  habitName: string
  description?: string | null
}

export interface HabitDigestPushParams {
  type: "morning" | "evening"
  habitNames: string[]
}

/**
 * High-level Notification Service Abstraction.
 * Isolates delivery mechanisms (Web Push, future channels) from core domain logic.
 */
export class NotificationService {
  constructor(private provider: NotificationProvider = defaultWebPushProvider) {}

  /**
   * Sends a notification to all active devices/subscriptions of an authenticated user.
   * Supports multiple devices.
   * Automatically prunes expired or invalid subscriptions from the database.
   */
  async sendNotificationToUser(
    supabase: SupabaseClient<Database>,
    userId: string,
    payload: NotificationPayload
  ): Promise<UserNotificationBatchResult> {
    // 1. Fetch all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)

    if (error) {
      return {
        success: false,
        totalSubscriptions: 0,
        sentCount: 0,
        expiredCount: 0,
        failedCount: 0,
        results: [],
        error: error.message,
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: true,
        totalSubscriptions: 0,
        sentCount: 0,
        expiredCount: 0,
        failedCount: 0,
        results: [],
      }
    }

    // 2. Deliver to each device subscription concurrently
    const deliveryPromises = subscriptions.map((sub) =>
      this.provider.send(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
    )

    const results: NotificationSendResult[] = await Promise.all(deliveryPromises)

    let sentCount = 0
    let expiredCount = 0
    let failedCount = 0
    const deadEndpoints: string[] = []

    for (const res of results) {
      if (res.status === "sent") {
        sentCount++
      } else if (res.status === "expired" || res.status === "invalid") {
        expiredCount++
        deadEndpoints.push(res.endpoint)
      } else {
        failedCount++
      }
    }

    // 3. Automatically prune expired or invalid subscriptions from the database
    if (deadEndpoints.length > 0) {
      try {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .in("endpoint", deadEndpoints)
      } catch (pruneErr) {
        console.warn("Failed to prune expired push subscriptions:", pruneErr)
      }
    }

    return {
      success: sentCount > 0 || (subscriptions.length > 0 && expiredCount === subscriptions.length),
      totalSubscriptions: subscriptions.length,
      sentCount,
      expiredCount,
      failedCount,
      results,
    }
  }

  /**
   * Sends a reminder notification to the user's registered devices.
   */
  async sendReminderPush(
    supabase: SupabaseClient<Database>,
    userId: string,
    params: ReminderPushParams
  ): Promise<UserNotificationBatchResult> {
    const payload: NotificationPayload = {
      title: `Reminder: ${params.title}`,
      body: params.body || "You have a scheduled reminder in MyOS.",
      url: "/reminders",
      tag: `reminder-${params.reminderId}`,
      data: {
        type: "reminder",
        reminderId: params.reminderId,
      },
    }

    const result = await this.sendNotificationToUser(supabase, userId, payload)

    // Update notification_deliveries log if present
    if (params.reminderId) {
      try {
        await supabase
          .from("notification_deliveries")
          .update({
            status: result.sentCount > 0 ? "delivered" : "failed",
            delivered_at: result.sentCount > 0 ? new Date().toISOString() : null,
            error_message: result.error || (result.failedCount > 0 ? "Delivery failed on some devices." : null),
          })
          .eq("reminder_id", params.reminderId)
          .eq("user_id", userId)
          .eq("status", "pending")
      } catch {
        // Logging update is best-effort
      }
    }

    return result
  }

  /**
   * Sends a Pomodoro session completion notification.
   */
  async sendPomodoroPush(
    supabase: SupabaseClient<Database>,
    userId: string,
    params: PomodoroPushParams
  ): Promise<UserNotificationBatchResult> {
    let title: string
    let body: string
    let tag: string

    if (params.type === "focus") {
      title = "Focus Session Complete!"
      body = params.taskTitle
        ? `Finished focus on "${params.taskTitle}". Time for a well-deserved break!`
        : "Focus interval ended. Step away and take a refreshing break."
      tag = "pomodoro-focus-complete"
    } else {
      title = "Break Finished!"
      body = "Break time is up. Ready to begin your next focus session?"
      tag = "pomodoro-break-complete"
    }

    const payload: NotificationPayload = {
      title,
      body,
      url: "/focus",
      tag,
      data: {
        type: "pomodoro",
        sessionType: params.type,
      },
    }

    return this.sendNotificationToUser(supabase, userId, payload)
  }

  /**
   * Sends an individual habit reminder notification.
   */
  async sendHabitReminderPush(
    supabase: SupabaseClient<Database>,
    userId: string,
    params: HabitPushParams
  ): Promise<UserNotificationBatchResult> {
    const payload: NotificationPayload = {
      title: `Habit Reminder: ${params.habitName}`,
      body: params.description || "Time to complete your habit and protect your streak!",
      url: "/habits",
      tag: `habit-${params.habitId}`,
      data: {
        type: "habit",
        habitId: params.habitId,
      },
    }

    return this.sendNotificationToUser(supabase, userId, payload)
  }

  /**
   * Sends a daily habit smart digest notification (Morning Kickoff or Evening Streak Saver).
   */
  async sendHabitDailyDigestPush(
    supabase: SupabaseClient<Database>,
    userId: string,
    params: HabitDigestPushParams
  ): Promise<UserNotificationBatchResult> {
    let title: string
    let body: string
    let tag: string

    const habitPreview = params.habitNames.slice(0, 3).join(", ")
    const moreSuffix = params.habitNames.length > 3 ? ` +${params.habitNames.length - 3} more` : ""

    if (params.type === "morning") {
      title = "🌅 Morning Habit Kickoff"
      body =
        params.habitNames.length > 0
          ? `You have ${params.habitNames.length} habits scheduled today: ${habitPreview}${moreSuffix}.`
          : "Ready to make today great? Check your scheduled daily habits."
      tag = "habit-morning-kickoff"
    } else {
      title = "🔥 Protect Your Streak!"
      body =
        params.habitNames.length > 0
          ? `Keep your streak going! ${params.habitNames.length} ${params.habitNames.length === 1 ? "habit" : "habits"} remaining: ${habitPreview}${moreSuffix}.`
          : "All scheduled habits are completed! Amazing job today!"
      tag = "habit-evening-saver"
    }

    const payload: NotificationPayload = {
      title,
      body,
      url: "/today",
      tag,
      data: {
        type: "habit-digest",
        digestType: params.type,
      },
    }

    return this.sendNotificationToUser(supabase, userId, payload)
  }
}

export const notificationService = new NotificationService()
