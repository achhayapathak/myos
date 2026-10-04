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
  Sun,
  Flame,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePushNotifications } from "./use-push-notifications"
import {
  getHabitNotificationPreferencesAction,
  updateHabitNotificationPreferencesAction,
  sendTestHabitPushAction,
  type HabitNotificationPreferences,
} from "@/app/(app)/settings/push-actions"

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

  // Habit Notification Preferences State
  const [habitPrefs, setHabitPrefs] = React.useState<HabitNotificationPreferences>({
    enabled: true,
    morningTime: "09:00",
    eveningTime: "20:00",
  })
  const [habitTestSent, setHabitTestSent] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function loadHabitPrefs() {
      try {
        const res = await getHabitNotificationPreferencesAction()
        if (mounted && res.success && res.data) {
          setHabitPrefs(res.data)
        }
      } catch {
        // Best effort
      }
    }
    loadHabitPrefs()
    return () => {
      mounted = false
    }
  }, [])

  const handleToggleHabitNotifications = async () => {
    const nextEnabled = !habitPrefs.enabled
    setHabitPrefs((prev) => ({ ...prev, enabled: nextEnabled }))
    await updateHabitNotificationPreferencesAction({ enabled: nextEnabled })
  }

  const handleUpdateMorningTime = async (time: string) => {
    setHabitPrefs((prev) => ({ ...prev, morningTime: time }))
    await updateHabitNotificationPreferencesAction({ morningTime: time })
  }

  const handleUpdateEveningTime = async (time: string) => {
    setHabitPrefs((prev) => ({ ...prev, eveningTime: time }))
    await updateHabitNotificationPreferencesAction({ eveningTime: time })
  }

  const handleSendHabitTest = async (type: "morning" | "evening") => {
    setActionPending(true)
    const res = await sendTestHabitPushAction(type)
    setActionPending(false)
    if (res.success) {
      setHabitTestSent(type)
      setTimeout(() => setHabitTestSent(null), 4000)
    }
  }

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

      {/* Habit Reminders Sub-section */}
      {isSupported && isSubscribed && (
        <div className="pt-4 mt-2 border-t border-border/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Habit Reminders & Smart Check-ins
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated morning kickoff, evening streak saver, and custom habit times.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={habitPrefs.enabled}
              aria-label="Toggle habit reminders"
              onClick={handleToggleHabitNotifications}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                habitPrefs.enabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                  habitPrefs.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {habitPrefs.enabled && (
            <div className="flex flex-col gap-3.5 bg-muted/20 p-3.5 rounded-lg border border-border/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Morning Kickoff */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="habit-morning-time"
                    className="text-xs font-medium text-foreground flex items-center gap-1.5"
                  >
                    <Sun className="size-3.5 text-amber-500" />
                    <span>Morning Kickoff Digest</span>
                  </label>
                  <Input
                    id="habit-morning-time"
                    type="time"
                    value={habitPrefs.morningTime}
                    onChange={(e) => handleUpdateMorningTime(e.target.value)}
                    className="h-8 font-mono text-xs bg-background border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Daily overview of all habits scheduled for today.
                  </p>
                </div>

                {/* Evening Streak Saver */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="habit-evening-time"
                    className="text-xs font-medium text-foreground flex items-center gap-1.5"
                  >
                    <Flame className="size-3.5 text-orange-500" />
                    <span>Evening Streak Saver</span>
                  </label>
                  <Input
                    id="habit-evening-time"
                    type="time"
                    value={habitPrefs.eveningTime}
                    onChange={(e) => handleUpdateEveningTime(e.target.value)}
                    className="h-8 font-mono text-xs bg-background border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only alerts you if scheduled habits remain incomplete.
                  </p>
                </div>
              </div>

              {/* Habit Test Buttons */}
              <div className="pt-2 border-t border-border/30 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendHabitTest("morning")}
                  disabled={actionPending}
                  className="gap-1.5 font-mono text-[11px] h-7 cursor-pointer"
                >
                  <Sun className="size-3 text-amber-500" />
                  <span>
                    {habitTestSent === "morning" ? "Morning Alert Sent!" : "Test Morning Kickoff"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendHabitTest("evening")}
                  disabled={actionPending}
                  className="gap-1.5 font-mono text-[11px] h-7 cursor-pointer"
                >
                  <Flame className="size-3 text-orange-500" />
                  <span>
                    {habitTestSent === "evening" ? "Streak Saver Sent!" : "Test Streak Saver"}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
