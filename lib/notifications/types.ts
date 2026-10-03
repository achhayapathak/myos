/**
 * TypeScript Type Definitions for MyOS Notification Service Abstraction
 */

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: PushSubscriptionKeys
}

export interface NotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
}

export type NotificationSendStatus = "sent" | "expired" | "invalid" | "failed"

export interface NotificationSendResult {
  endpoint: string
  status: NotificationSendStatus
  statusCode?: number
  error?: string
}

export interface UserNotificationBatchResult {
  success: boolean
  totalSubscriptions: number
  sentCount: number
  expiredCount: number
  failedCount: number
  results: NotificationSendResult[]
  error?: string
}

export interface NotificationProvider {
  send(
    subscription: PushSubscriptionPayload,
    payload: NotificationPayload
  ): Promise<NotificationSendResult>
}
