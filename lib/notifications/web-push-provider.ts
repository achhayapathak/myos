import "server-only"
import webpush from "web-push"
import type {
  PushSubscriptionPayload,
  NotificationPayload,
  NotificationSendResult,
  NotificationProvider,
} from "./types"

/**
 * Server-only Web Push Provider using VAPID authentication.
 * Never exposes VAPID private key to client.
 */
class WebPushProvider implements NotificationProvider {
  private configured = false

  private configureVapid(): boolean {
    if (this.configured) return true

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || "mailto:notifications@myos.local"

    if (!publicKey || !privateKey) {
      return false
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      this.configured = true
      return true
    } catch (err) {
      console.error("Failed to configure VAPID details:", err)
      return false
    }
  }

  async send(
    subscription: PushSubscriptionPayload,
    payload: NotificationPayload
  ): Promise<NotificationSendResult> {
    if (!this.configureVapid()) {
      return {
        endpoint: subscription.endpoint,
        status: "failed",
        error: "VAPID keys not configured on server.",
      }
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    }

    const pushData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/today",
      tag: payload.tag,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-192x192.png",
      data: payload.data || {},
    })

    try {
      const response = await webpush.sendNotification(pushSubscription, pushData)
      return {
        endpoint: subscription.endpoint,
        status: "sent",
        statusCode: response.statusCode,
      }
    } catch (err: unknown) {
      const webPushError = err as { statusCode?: number; message?: string }
      const statusCode = webPushError.statusCode

      // HTTP 404 Not Found or 410 Gone indicates expired or revoked subscription
      if (statusCode === 404 || statusCode === 410) {
        return {
          endpoint: subscription.endpoint,
          status: "expired",
          statusCode,
          error: "Push subscription has expired or was unsubscribed on client.",
        }
      }

      // HTTP 400 Bad Request indicates malformed subscription or key mismatch
      if (statusCode === 400) {
        return {
          endpoint: subscription.endpoint,
          status: "invalid",
          statusCode,
          error: webPushError.message || "Invalid push subscription.",
        }
      }

      return {
        endpoint: subscription.endpoint,
        status: "failed",
        statusCode,
        error: webPushError.message || "Failed to deliver push notification.",
      }
    }
  }
}

export const defaultWebPushProvider = new WebPushProvider()
