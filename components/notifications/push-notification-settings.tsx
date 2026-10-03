"use client"

import * as React from "react"
import {
  Bell,
  BellOff,
  BellRing,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Send,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePushNotifications } from "./use-push-notifications"

export function PushNotificationSettings() {
  const {
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
  } = usePushNotifications()

  const [testSent, setTestSent] = React.useState(false)
  const [actionPending, setActionPending] = React.useState(false)

  const handleSubscribe = async () => {
    setActionPending(true)
    await subscribe()
    setActionPending(false)
  }

  const handleUnsubscribe = async () => {
    setActionPending(true)
    await unsubscribe()
    setActionPending(false)
  }

  const handleRevokeAll = async () => {
    if (!confirm("Are you sure you want to revoke push notifications on all your devices?")) {
      return
    }
    setActionPending(true)
    await revokeAll()
    setActionPending(false)
  }

  const handleSendTest = async () => {
    setActionPending(true)
    const ok = await sendTest()
    setActionPending(false)
    if (ok) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 4000)
    }
  }

  return (
    <section className="p-5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Web Push Notifications</h3>
        </div>

        {isSupported ? (
          isSubscribed ? (
            <Badge
              variant="outline"
              className="gap-1 font-mono text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
            >
              <CheckCircle2 className="size-3" />
              <span>Subscribed</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="font-mono text-[10px] text-muted-foreground border-border"
            >
              Not Active
            </Badge>
          )
        ) : (
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5"
          >
            Unsupported
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Receive instant alerts for scheduled reminders and Pomodoro timer completions across your
        devices, even when MyOS is closed or in the background.
      </p>

      {/* Unsupported Browser Warning */}
      {!isSupported && !isLoading && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="size-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block">Browser Not Supported</span>
            <span>
              Your current browser does not support the Web Push or Service Worker APIs. Use Chrome,
              Edge, or modern Safari to enable push notifications.
            </span>
          </div>
        </div>
      )}

      {/* Permission Denied Warning */}
      {permission === "denied" && (
        <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2.5 text-xs text-destructive">
          <ShieldAlert className="size-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block">Notifications Blocked by Browser</span>
            <span>
              You previously denied notification permissions. To enable push alerts, click the site
              settings icon in your browser&apos;s address bar and set Notifications to &quot;Allow&quot;.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && permission !== "denied" && (
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Device Count & Status Details */}
      {isSupported && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Current Device</span>
            </div>
            <span className={isSubscribed ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
              {isSubscribed ? "Active" : "Disabled"}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Total Devices</span>
            </div>
            <span className="font-semibold text-foreground">
              {deviceCount} {deviceCount === 1 ? "device" : "devices"}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isSupported && (
        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          {!isSubscribed ? (
            <Button
              size="sm"
              onClick={handleSubscribe}
              disabled={isLoading || actionPending}
              className="gap-2 font-mono text-xs cursor-pointer min-h-[36px] touch-manipulation"
            >
              {actionPending ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Bell className="size-3.5" />
              )}
              <span>Enable Notifications on This Device</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTest}
                disabled={isLoading || actionPending}
                className="gap-2 font-mono text-xs cursor-pointer min-h-[36px] touch-manipulation"
              >
                {actionPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                <span>{testSent ? "Test Sent!" : "Send Test Notification"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsubscribe}
                disabled={isLoading || actionPending}
                className="gap-2 font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer min-h-[36px] touch-manipulation"
              >
                <BellOff className="size-3.5" />
                <span>Disable on This Device</span>
              </Button>

              {deviceCount > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeAll}
                  disabled={isLoading || actionPending}
                  className="gap-2 font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer ml-auto min-h-[36px] touch-manipulation"
                >
                  <Trash2 className="size-3.5" />
                  <span>Revoke All Devices ({deviceCount})</span>
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
