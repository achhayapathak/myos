import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { NotificationService } from "@/lib/notifications/service"
import type {
  NotificationProvider,
  PushSubscriptionPayload,
  NotificationPayload,
  NotificationSendResult,
} from "@/lib/notifications/types"
import {
  savePushSubscription,
  revokePushSubscription,
  revokeAllPushSubscriptions,
  getPushSubscriptionCount,
  sendTestNotificationAction,
  sendPomodoroPushAction,
  sendReminderPushAction,
} from "@/app/(app)/settings/push-actions"
import {
  urlBase64ToUint8Array,
  isPushNotificationSupported,
} from "@/lib/notifications/client-utils"

// Mocks for Supabase & Auth
const mockGetUser = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()

const mockSupabase = {
  from: vi.fn((table?: string) => {
    if (table === "reminders") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "rem-1", title: "Test Reminder", remind_at: new Date().toISOString() },
                error: null,
              }),
            })),
          })),
        })),
      }
    }

    return {
      upsert: mockUpsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "sub-123" }, error: null }),
        })),
      }),
      delete: mockDelete.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
      }),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      })),
      update: mockUpdate,
    }
  }),
} as unknown as SupabaseClient<Database>

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(() => mockGetUser()),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Web Push Notifications Specification & Service Abstraction Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      id: "user-test-uuid",
      email: "owner@myos.local",
    })
  })

  describe("1. Architectural Security & Secret Isolation", () => {
    it("ensures VAPID private key is server-only and never exposed client-side", () => {
      const webPushProviderPath = path.join(
        rootDir,
        "lib/notifications/web-push-provider.ts"
      )
      const servicePath = path.join(rootDir, "lib/notifications/service.ts")

      expect(fs.existsSync(webPushProviderPath)).toBe(true)
      expect(fs.existsSync(servicePath)).toBe(true)

      const providerContent = fs.readFileSync(webPushProviderPath, "utf-8")
      const serviceContent = fs.readFileSync(servicePath, "utf-8")

      expect(providerContent).toMatch(/import\s+["']server-only["']/)
      expect(serviceContent).toMatch(/import\s+["']server-only["']/)

      // Ensure VAPID_PRIVATE_KEY does NOT have NEXT_PUBLIC_ prefix
      expect(providerContent).toContain("process.env.VAPID_PRIVATE_KEY")
      expect(providerContent).not.toContain("process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY")
    })

    it("ensures push actions require authenticated session identity", async () => {
      mockGetUser.mockResolvedValueOnce(null)

      const res = await savePushSubscription({
        endpoint: "https://fcm.googleapis.com/fcm/send/fake-endpoint",
        keys: {
          p256dh: "BMw87823hjdshf8732hjsd",
          auth: "authsecret123",
        },
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })
  })

  describe("2. Client Utils & Feature Detection", () => {
    it("converts urlBase64 strings to Uint8Array correctly", () => {
      const sampleBase64Url =
        "BOIW4I_WYd-z9HgNCf4xF7OLS-Kk66FPdjW9_DXH0NKCvjidFVR0mpQdwVRDx-TeWXIRul8z8K3z-6DER30hl0E"
      const array = urlBase64ToUint8Array(sampleBase64Url)

      expect(array).toBeInstanceOf(Uint8Array)
      expect(array.length).toBeGreaterThan(32)
    })

    it("evaluates push notification support gracefully", () => {
      const supported = isPushNotificationSupported()
      expect(typeof supported).toBe("boolean")
    })
  })

  describe("3. Subscription Persistence & Multiple Devices", () => {
    it("validates and stores valid push subscription with user_id", async () => {
      const validSub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/endpoint-device-1",
        keys: {
          p256dh: "BMw87823hjdshf8732hjsd_sample_key",
          auth: "authsecret123",
        },
      }

      const res = await savePushSubscription(validSub)
      expect(res.success).toBe(true)
      expect(res.data?.id).toBe("sub-123")

      // Must have invoked upsert with conflict on user_id, endpoint
      expect(mockSupabase.from).toHaveBeenCalledWith("push_subscriptions")
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-test-uuid",
          endpoint: validSub.endpoint,
          p256dh: validSub.keys.p256dh,
          auth: validSub.keys.auth,
        }),
        { onConflict: "user_id,endpoint" }
      )
    })

    it("rejects malformed push subscriptions with Zod validation errors", async () => {
      const invalidSub = {
        endpoint: "not-a-url",
        keys: {
          p256dh: "short",
          auth: "1",
        },
      }

      const res = await savePushSubscription(invalidSub)
      expect(res.success).toBe(false)
      expect(res.error).toBeDefined()
    })

    it("allows revoking a specific device subscription", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/device-a"
      const res = await revokePushSubscription(endpoint)

      expect(res.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("push_subscriptions")
      expect(mockDelete).toHaveBeenCalled()
    })

    it("allows revoking all device subscriptions for the user", async () => {
      const res = await revokeAllPushSubscriptions()

      expect(res.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("push_subscriptions")
      expect(mockDelete).toHaveBeenCalled()
    })

    it("retrieves the active push device count for user", async () => {
      const res = await getPushSubscriptionCount()
      expect(res.success).toBe(true)
      expect(res.data?.count).toBeDefined()
    })

    it("handles test push notification server action", async () => {
      const res = await sendTestNotificationAction()
      expect(res).toBeDefined()
    })

    it("handles server actions for pomodoro and reminder pushes", async () => {
      const pomodoroRes = await sendPomodoroPushAction("focus", "Write Code")
      expect(pomodoroRes.success).toBe(true)

      const reminderRes = await sendReminderPushAction("rem-1")
      expect(reminderRes.success).toBe(true)
    })
  })

  describe("4. Notification Service Abstraction & Multi-Device Broadcasting", () => {
    it("delivers push notifications to all user subscriptions", async () => {
      const mockProvider: NotificationProvider = {
        send: vi.fn(
          async (sub: PushSubscriptionPayload): Promise<NotificationSendResult> => ({
            endpoint: sub.endpoint,
            status: "sent",
            statusCode: 201,
          })
        ),
      }

      const service = new NotificationService(mockProvider)

      const fakeClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  endpoint: "https://push.service.com/phone",
                  p256dh: "key-phone",
                  auth: "auth-phone",
                },
                {
                  endpoint: "https://push.service.com/laptop",
                  p256dh: "key-laptop",
                  auth: "auth-laptop",
                },
              ],
              error: null,
            }),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await service.sendNotificationToUser(
        fakeClient,
        "user-test-uuid",
        {
          title: "MyOS Alert",
          body: "Focus session complete!",
        }
      )

      expect(result.success).toBe(true)
      expect(result.totalSubscriptions).toBe(2)
      expect(result.sentCount).toBe(2)
      expect(result.expiredCount).toBe(0)
      expect(mockProvider.send).toHaveBeenCalledTimes(2)
    })

    it("automatically cleans up expired (404/410) and invalid subscriptions", async () => {
      const mockDeleteQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const mockProvider: NotificationProvider = {
        send: vi.fn(
          async (sub: PushSubscriptionPayload): Promise<NotificationSendResult> => {
            if (sub.endpoint.includes("stale-phone")) {
              return {
                endpoint: sub.endpoint,
                status: "expired",
                statusCode: 410,
                error: "Gone",
              }
            }
            return {
              endpoint: sub.endpoint,
              status: "sent",
              statusCode: 201,
            }
          }
        ),
      }

      const service = new NotificationService(mockProvider)

      const fakeClient = {
        from: vi.fn((table: string) => {
          if (table === "push_subscriptions") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      endpoint: "https://push.service.com/stale-phone",
                      p256dh: "stale-key",
                      auth: "stale-auth",
                    },
                    {
                      endpoint: "https://push.service.com/active-laptop",
                      p256dh: "active-key",
                      auth: "active-auth",
                    },
                  ],
                  error: null,
                }),
              })),
              delete: mockDeleteQuery,
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>

      const result = await service.sendNotificationToUser(
        fakeClient,
        "user-test-uuid",
        {
          title: "Reminder Due",
          body: "Check today tasks",
        }
      )

      expect(result.totalSubscriptions).toBe(2)
      expect(result.sentCount).toBe(1)
      expect(result.expiredCount).toBe(1)
      // Pruning dead endpoints
      expect(mockDeleteQuery).toHaveBeenCalled()
    })
  })

  describe("5. Domain Push Support: Reminders & Pomodoro", () => {
    it("formats reminder notification with reminderId tag and url", async () => {
      const mockProvider: NotificationProvider = {
        send: vi.fn(
          async (sub: PushSubscriptionPayload, payload: NotificationPayload): Promise<NotificationSendResult> => {
            expect(payload.title).toContain("Submit Quarterly Report")
            expect(payload.url).toBe("/reminders")
            expect(payload.tag).toBe("reminder-rem-999")
            return {
              endpoint: sub.endpoint,
              status: "sent",
              statusCode: 201,
            }
          }
        ),
      }

      const service = new NotificationService(mockProvider)

      const fakeClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  endpoint: "https://push.service.com/device1",
                  p256dh: "k1",
                  auth: "a1",
                },
              ],
              error: null,
            }),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const res = await service.sendReminderPush(fakeClient, "user-test-uuid", {
        reminderId: "rem-999",
        title: "Submit Quarterly Report",
      })

      expect(res.sentCount).toBe(1)
    })

    it("formats Pomodoro focus completion notification with task title", async () => {
      let dispatchedPayload: NotificationPayload | null = null

      const mockProvider: NotificationProvider = {
        send: vi.fn(
          async (sub: PushSubscriptionPayload, payload: NotificationPayload): Promise<NotificationSendResult> => {
            dispatchedPayload = payload
            return {
              endpoint: sub.endpoint,
              status: "sent",
              statusCode: 201,
            }
          }
        ),
      }

      const service = new NotificationService(mockProvider)

      const fakeClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  endpoint: "https://push.service.com/device1",
                  p256dh: "k1",
                  auth: "a1",
                },
              ],
              error: null,
            }),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await service.sendPomodoroPush(fakeClient, "user-test-uuid", {
        type: "focus",
        taskTitle: "Design Database Migration",
      })

      expect(dispatchedPayload).not.toBeNull()
      const payload = dispatchedPayload as unknown as NotificationPayload
      expect(payload.title).toBe("Focus Session Complete!")
      expect(payload.body).toContain("Design Database Migration")
      expect(payload.url).toBe("/focus")
      expect(payload.tag).toBe("pomodoro-focus-complete")
    })

    it("formats Pomodoro break finished notification", async () => {
      let dispatchedPayload: NotificationPayload | null = null

      const mockProvider: NotificationProvider = {
        send: vi.fn(
          async (sub: PushSubscriptionPayload, payload: NotificationPayload): Promise<NotificationSendResult> => {
            dispatchedPayload = payload
            return {
              endpoint: sub.endpoint,
              status: "sent",
              statusCode: 201,
            }
          }
        ),
      }

      const service = new NotificationService(mockProvider)

      const fakeClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  endpoint: "https://push.service.com/device1",
                  p256dh: "k1",
                  auth: "a1",
                },
              ],
              error: null,
            }),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await service.sendPomodoroPush(fakeClient, "user-test-uuid", {
        type: "short_break",
      })

      expect(dispatchedPayload).not.toBeNull()
      const payload = dispatchedPayload as unknown as NotificationPayload
      expect(payload.title).toBe("Break Finished!")
      expect(payload.body).toContain("Ready to begin your next focus session")
      expect(payload.tag).toBe("pomodoro-break-complete")
    })
  })

  describe("6. Service Worker Push & Notification Click Handlers", () => {
    it("ensures public/sw.js contains push event listener with notification options", () => {
      const swPath = path.join(rootDir, "public/sw.js")
      expect(fs.existsSync(swPath)).toBe(true)

      const swContent = fs.readFileSync(swPath, "utf-8")
      expect(swContent).toMatch(/addEventListener\(["']push["']/)
      expect(swContent).toContain("showNotification")
      expect(swContent).toContain("myos-notification")
    })

    it("ensures public/sw.js contains notificationclick handler with navigation", () => {
      const swPath = path.join(rootDir, "public/sw.js")
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toMatch(/addEventListener\(["']notificationclick["']/)
      expect(swContent).toContain("clients.matchAll")
      expect(swContent).toContain("clients.openWindow")
    })
  })

  describe("7. Settings UI Integration", () => {
    it("verifies Settings page includes PushNotificationSettings component", () => {
      const settingsPagePath = path.join(rootDir, "app/(app)/settings/page.tsx")
      expect(fs.existsSync(settingsPagePath)).toBe(true)

      const content = fs.readFileSync(settingsPagePath, "utf-8")
      expect(content).toContain("<PushNotificationSettings />")
      expect(content).toContain("import { PushNotificationSettings }")
    })

    it("ensures PushNotificationSettings component handles permission denied and unsupported browser", () => {
      const componentPath = path.join(
        rootDir,
        "components/notifications/push-notification-settings.tsx"
      )
      expect(fs.existsSync(componentPath)).toBe(true)

      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toContain("Notifications Blocked by Browser")
      expect(content).toContain("Browser Not Supported")
      expect(content).toContain("Enable Notifications on This Device")
      expect(content).toContain("Revoke All Devices")
    })
  })
})
