"use client"

import * as React from "react"
import {
  isPushNotificationSupported,
  urlBase64ToUint8Array,
} from "@/lib/notifications/client-utils"
import {
  savePushSubscription,
  revokePushSubscription,
  revokeAllPushSubscriptions,
  getPushSubscriptionCount,
  sendTestNotificationAction,
} from "@/app/(app)/settings/push-actions"

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported"

function subscribeNoop() {
  return () => {}
}

function getPermissionSnapshot(): NotificationPermissionState {
  if (typeof window === "undefined" || !isPushNotificationSupported()) {
    return "unsupported"
  }
  return Notification.permission
}

function getIsSupportedSnapshot(): boolean {
  return isPushNotificationSupported()
}

export function usePushNotifications() {
  const isSupported = React.useSyncExternalStore(
    subscribeNoop,
    getIsSupportedSnapshot,
    () => false
  )
  const systemPermission = React.useSyncExternalStore(
    subscribeNoop,
    getPermissionSnapshot,
    () => "unsupported" as NotificationPermissionState
  )
  const [explicitPermission, setExplicitPermission] =
    React.useState<NotificationPermissionState | null>(null)
  const permission = explicitPermission || systemPermission

  const [isSubscribed, setIsSubscribed] = React.useState<boolean>(false)
  const [deviceCount, setDeviceCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  const refreshStatus = React.useCallback(async () => {
    if (!isPushNotificationSupported()) {
      setIsLoading(false)
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(Boolean(sub))

      const countRes = await getPushSubscriptionCount()
      if (countRes.success && countRes.data) {
        setDeviceCount(countRes.data.count)
      }
    } catch (err) {
      console.warn("Error refreshing push subscription status:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let mounted = true

    async function init() {
      if (!isPushNotificationSupported()) {
        setIsLoading(false)
        return
      }

      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        const countRes = await getPushSubscriptionCount()

        if (mounted) {
          setIsSubscribed(Boolean(sub))
          if (countRes.success && countRes.data) {
            setDeviceCount(countRes.data.count)
          }
        }
      } catch (err) {
        console.warn("Error loading push subscription status:", err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void init()

    return () => {
      mounted = false
    }
  }, [])

  // Explicit user action: Request permission and subscribe
  const subscribe = React.useCallback(async (): Promise<boolean> => {
    setError(null)
    setIsLoading(true)

    try {
      if (!isPushNotificationSupported()) {
        setError("Web Push notifications are not supported by this browser.")
        setIsLoading(false)
        return false
      }

      // Check if previously denied
      if (Notification.permission === "denied") {
        setExplicitPermission("denied")
        setError(
          "Notification permission was denied. Please allow notifications in your browser's site settings."
        )
        setIsLoading(false)
        return false
      }

      // 1. Explicitly prompt user for permission
      const result = await Notification.requestPermission()
      setExplicitPermission(result)

      if (result !== "granted") {
        setError("Notification permission was not granted.")
        setIsLoading(false)
        return false
      }

      // 2. Ensure service worker is ready
      const registration = await navigator.serviceWorker.ready

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setError("VAPID public key not configured on server.")
        setIsLoading(false)
        return false
      }

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey)

      // 3. Subscribe with PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      })

      const p256dhKey = subscription.getKey("p256dh")
      const authKey = subscription.getKey("auth")

      if (!p256dhKey || !authKey) {
        throw new Error("Failed to extract subscription encryption keys.")
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)))
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)))

      // 4. Save subscription securely on server associated with authenticated user
      const serverResult = await savePushSubscription({
        endpoint: subscription.endpoint,
        keys: { p256dh, auth },
      })

      if (!serverResult.success) {
        setError(serverResult.error || "Failed to persist push subscription on server.")
        setIsLoading(false)
        return false
      }

      setIsSubscribed(true)
      await refreshStatus()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to subscribe to notifications."
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshStatus])

  // Explicit user action: Revoke current device subscription
  const unsubscribe = React.useCallback(async (): Promise<boolean> => {
    setError(null)
    setIsLoading(true)

    try {
      if (!isPushNotificationSupported()) return false

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await revokePushSubscription(endpoint)
      }

      setIsSubscribed(false)
      await refreshStatus()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unsubscribe."
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshStatus])

  // Explicit user action: Revoke all device subscriptions
  const revokeAll = React.useCallback(async (): Promise<boolean> => {
    setError(null)
    setIsLoading(true)

    try {
      if (isPushNotificationSupported()) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
        }
      }

      const res = await revokeAllPushSubscriptions()
      if (!res.success) {
        setError(res.error || "Failed to revoke all subscriptions.")
        return false
      }

      setIsSubscribed(false)
      await refreshStatus()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke all devices."
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshStatus])

  // Explicit user action: Send test notification
  const sendTest = React.useCallback(async () => {
    setError(null)
    try {
      const res = await sendTestNotificationAction()
      if (!res.success) {
        setError(res.error || "Test notification delivery failed.")
        return false
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test notification."
      setError(message)
      return false
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    deviceCount,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    revokeAll,
    sendTest,
    refreshStatus,
  }
}
