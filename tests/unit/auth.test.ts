import { describe, it, expect, vi, beforeEach } from "vitest"
import { getAuthRedirect } from "@/lib/supabase/middleware"
import type { User } from "@supabase/supabase-js"

// Mock Next.js navigation redirect
const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}))

// Mock Supabase server client
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockGetSession = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  })),
}))

const mockUser: User = {
  id: "user-12345",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "owner@myos.local",
}

describe("Authentication & Route Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. Unauthenticated Route Protection", () => {
    it("redirects unauthenticated users from protected dashboard routes to /login", () => {
      const protectedRoutes = [
        "/",
        "/today",
        "/tasks",
        "/notes",
        "/focus",
        "/calendar",
        "/reminders",
        "/settings",
      ]

      for (const route of protectedRoutes) {
        expect(getAuthRedirect(route, null)).toBe("/login")
      }
    })

    it("allows unauthenticated users to access auth routes", () => {
      const publicAuthRoutes = [
        "/login",
        "/forgot-password",
        "/reset-password",
        "/auth/callback",
      ]

      for (const route of publicAuthRoutes) {
        expect(getAuthRedirect(route, null)).toBeNull()
      }
    })
  })

  describe("2. Authenticated Access", () => {
    it("allows authenticated users to access protected application routes", () => {
      const protectedRoutes = [
        "/today",
        "/tasks",
        "/notes",
        "/focus",
        "/calendar",
        "/reminders",
        "/settings",
      ]

      for (const route of protectedRoutes) {
        expect(getAuthRedirect(route, mockUser)).toBeNull()
      }
    })

    it("redirects authenticated users away from /login and /forgot-password to /today", () => {
      expect(getAuthRedirect("/login", mockUser)).toBe("/today")
      expect(getAuthRedirect("/forgot-password", mockUser)).toBe("/today")
    })
  })

  describe("3. Server-Side Auth Utilities", () => {
    it("getCurrentUser returns user when authenticated", async () => {
      const { getCurrentUser } = await import("@/lib/supabase/auth")
      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const user = await getCurrentUser()
      expect(user).toEqual(mockUser)
      expect(mockGetUser).toHaveBeenCalledTimes(1)
    })

    it("getCurrentUser returns null when unauthenticated or on error", async () => {
      const { getCurrentUser } = await import("@/lib/supabase/auth")
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Auth session missing"),
      })

      const user = await getCurrentUser()
      expect(user).toBeNull()
    })

    it("requireUser returns user when authenticated and throws when unauthenticated", async () => {
      const { requireUser } = await import("@/lib/supabase/auth")

      // Authenticated case
      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })
      await expect(requireUser()).resolves.toEqual(mockUser)

      // Unauthenticated case
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      await expect(requireUser()).rejects.toThrow("Unauthorized")
    })
  })

  describe("4. Logout Behavior", () => {
    it("calls supabase.auth.signOut and redirects to /login", async () => {
      const { logout } = await import("@/app/(auth)/actions")
      mockSignOut.mockResolvedValueOnce({ error: null })

      await logout()

      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(mockRedirect).toHaveBeenCalledWith("/login")
    })
  })
})
