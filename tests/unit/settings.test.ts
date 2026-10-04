import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import type { User } from "@supabase/supabase-js"

const mockGetCurrentUser = vi.fn()

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock("@/components/settings/theme-selector", () => ({
  ThemeSelector: () => React.createElement("div", { "data-testid": "theme-selector" }),
}))

vi.mock("@/components/notifications", () => ({
  PushNotificationSettings: () =>
    React.createElement("div", { "data-testid": "push-settings" }),
}))

vi.mock("@/app/(auth)/actions", () => ({
  logout: vi.fn(),
}))

const mockUser: User = {
  id: "user-12345",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "owner@myos.local",
}

describe("Settings Page - Logged In Email Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the authenticated user's email in the Account Email input and Active Session description", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(mockUser)

    const SettingsPage = (await import("@/app/(app)/settings/page")).default
    const element = await SettingsPage()

    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)

    // Verify element structure
    expect(element).toBeDefined()
    expect(element.type).toBe("div")

    // Helper to deeply find props/texts in JSX tree
    const jsonString = JSON.stringify(element)
    expect(jsonString).toContain("owner@myos.local")
    expect(jsonString).toContain("Account Email")
    expect(jsonString).toContain("Signed in as")
  })

  it("handles unauthenticated or missing email gracefully with a fallback", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null)

    const SettingsPage = (await import("@/app/(app)/settings/page")).default
    const element = await SettingsPage()

    const jsonString = JSON.stringify(element)
    expect(jsonString).toContain("Not authenticated")
  })
})
