import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { waitlistEmailSchema, normalizeEmail } from "@/lib/waitlist/validation"
import { getAuthRedirect } from "@/lib/supabase/middleware"
import type { User } from "@supabase/supabase-js"

// Mocks for lib/waitlist/actions.ts dependencies
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "waitlist_rate_limits") {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              gte: mockGte,
            }),
          }),
          insert: mockInsert,
        }
      }
      if (table === "waitlist") {
        return {
          insert: mockInsert,
        }
      }
      return {}
    }),
  })),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === "x-forwarded-for") return "192.168.1.1, 10.0.0.1"
      if (name === "x-real-ip") return "192.168.1.1"
      return null
    }),
  })),
}))

describe("Waitlist & Landing Page Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. Waitlist Validation & Email Normalization", () => {
    it("validates well-formed email addresses", () => {
      const validCases = [
        "user@example.com",
        "alex.smith@sub.domain.org",
        "test+filter@company.co",
        "first_last@myos.app",
      ]

      for (const email of validCases) {
        const result = waitlistEmailSchema.safeParse({ email })
        expect(result.success).toBe(true)
      }
    })

    it("rejects invalid email addresses with clear error messages", () => {
      const invalidCases = [
        "",
        "not-an-email",
        "@missingusername.com",
        "missingatsign.com",
        "user@",
        "user@.com",
      ]

      for (const email of invalidCases) {
        const result = waitlistEmailSchema.safeParse({ email })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBeDefined()
        }
      }
    })

    it("rejects excessively long email addresses (>320 characters)", () => {
      const longEmail = `${"a".repeat(310)}@example.com`
      const result = waitlistEmailSchema.safeParse({ email: longEmail })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Email address is too long.")
      }
    })

    it("normalizes email addresses by trimming whitespace and lowercasing", () => {
      expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com")
      expect(normalizeEmail("ALEX@DOMAIN.ORG\n")).toBe("alex@domain.org")
      expect(normalizeEmail("\tTest.Email@Sub.Domain.Co  ")).toBe("test.email@sub.domain.co")
    })

    it("rejects submissions with filled honeypot fields (bot protection)", () => {
      const botSubmission = {
        email: "bot@spammer.com",
        honeypot: "Acme Spammers LLC",
      }
      const result = waitlistEmailSchema.safeParse(botSubmission)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("honeypot"))).toBe(true)
      }
    })

    it("accepts submissions with empty honeypot fields (legitimate humans)", () => {
      const humanSubmission = {
        email: "human@example.com",
        honeypot: "",
      }
      const result = waitlistEmailSchema.safeParse(humanSubmission)
      expect(result.success).toBe(true)
    })
  })

  describe("2. Server Action: joinWaitlist", () => {
    it("silently accepts bot submissions without calling the database", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")
      const formData = new FormData()
      formData.set("email", "bot@automated.com")
      formData.set("company", "Bot Company Inc") // Honeypot field name is 'company'

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: true,
        message:
          "Your invitation request has been received. We'll be in touch with your access details.",
      })
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("successfully persists a valid new email to the waitlist", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")

      // Rate limit check returns 0 attempts
      mockGte.mockResolvedValueOnce({ count: 0, error: null })
      // Record rate limit attempt
      mockInsert.mockResolvedValueOnce({ error: null })
      // Insert email into waitlist
      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set("email", "NewUser@Example.com")
      formData.set("company", "")

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: true,
        message:
          "Your invitation request has been received. We'll be in touch with your access details.",
      })
      expect(mockInsert).toHaveBeenCalledWith({ email: "newuser@example.com" })
    })

    it("handles duplicate email submissions idempotently without revealing status", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")

      mockGte.mockResolvedValueOnce({ count: 0, error: null })
      mockInsert.mockResolvedValueOnce({ error: null })
      // Simulate PostgreSQL unique constraint violation error 23505
      mockInsert.mockResolvedValueOnce({
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      })

      const formData = new FormData()
      formData.set("email", "existing@example.com")
      formData.set("company", "")

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: true,
        message:
          "Your invitation request has been received. We'll be in touch with your access details.",
      })
    })

    it("enforces rate limits when threshold is exceeded", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")

      // Simulate 5 prior submissions in current window
      mockGte.mockResolvedValueOnce({ count: 5, error: null })

      const formData = new FormData()
      formData.set("email", "spammer@example.com")
      formData.set("company", "")

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: false,
        message: "Too many requests. Please try again later.",
      })
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("handles rate limit database query errors gracefully", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")

      mockGte.mockResolvedValueOnce({
        count: null,
        error: { code: "PGRST000", message: "Database connection failed" },
      })

      const formData = new FormData()
      formData.set("email", "test@example.com")
      formData.set("company", "")

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: false,
        message: "Something went wrong. Please try again later.",
      })
    })

    it("handles unexpected database insert failure gracefully", async () => {
      const { joinWaitlist } = await import("@/lib/waitlist/actions")

      mockGte.mockResolvedValueOnce({ count: 0, error: null })
      mockInsert.mockResolvedValueOnce({ error: null })
      mockInsert.mockResolvedValueOnce({
        error: { code: "50000", message: "Disk full or internal error" },
      })

      const formData = new FormData()
      formData.set("email", "test@example.com")
      formData.set("company", "")

      const result = await joinWaitlist(null, formData)

      expect(result).toEqual({
        success: false,
        message: "Something went wrong. Please try again later.",
      })
    })
  })

  describe("3. Waitlist Migration & Row Level Security (RLS)", () => {
    const rootDir = process.cwd()
    const migrationPath = path.join(
      rootDir,
      "supabase/migrations/20261014000000_waitlist.sql"
    )
    const migrationContent = fs.readFileSync(migrationPath, "utf-8")

    it("creates waitlist table with uuid, email, status, timestamps, and constraints", () => {
      expect(migrationContent).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?waitlist\s*\(/i)
      expect(migrationContent).toMatch(/id\s+UUID\s+PRIMARY\s+KEY/i)
      expect(migrationContent).toMatch(/email\s+TEXT\s+NOT\s+NULL/i)
      expect(migrationContent).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i)
      expect(migrationContent).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i)
      expect(migrationContent).toMatch(/invited_at\s+TIMESTAMPTZ\s+NULL/i)
      expect(migrationContent).toMatch(/CONSTRAINT\s+waitlist_email_unique\s+UNIQUE\s*\(email\)/i)
      expect(migrationContent).toMatch(/CHECK\s*\(status\s+IN\s*\('pending',\s*'invited',\s*'joined'\)\)/i)
    })

    it("enables Row Level Security on waitlist and waitlist_rate_limits tables", () => {
      expect(migrationContent).toMatch(/ALTER\s+TABLE\s+waitlist\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
      expect(migrationContent).toMatch(/ALTER\s+TABLE\s+waitlist_rate_limits\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    })

    it("does not define any public SELECT or INSERT policies (restricting access to service role)", () => {
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY[^\n]+ON\s+waitlist\s+FOR\s+SELECT/i)
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY[^\n]+ON\s+waitlist\s+FOR\s+ALL\s+TO\s+public/i)
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY[^\n]+ON\s+waitlist\s+FOR\s+ALL\s+TO\s+anon/i)
    })
  })

  describe("4. Route Protection & Public Landing Routing", () => {
    const mockUser: User = {
      id: "usr-12345",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-10-01T00:00:00Z",
    }

    it("permits unauthenticated access to the root landing page (/) and privacy page (/privacy)", () => {
      expect(getAuthRedirect("/", null)).toBeNull()
      expect(getAuthRedirect("/privacy", null)).toBeNull()
    })

    it("preserves redirection to /login for unauthenticated dashboard routes", () => {
      const protectedPaths = [
        "/today",
        "/tasks",
        "/notes",
        "/focus",
        "/calendar",
        "/habits",
        "/reminders",
        "/settings",
      ]

      for (const path of protectedPaths) {
        expect(getAuthRedirect(path, null)).toBe("/login")
      }
    })

    it("allows authenticated users to access dashboard routes", () => {
      expect(getAuthRedirect("/today", mockUser)).toBeNull()
      expect(getAuthRedirect("/tasks", mockUser)).toBeNull()
      expect(getAuthRedirect("/notes", mockUser)).toBeNull()
    })

    it("redirects authenticated users away from /login to /today", () => {
      expect(getAuthRedirect("/login", mockUser)).toBe("/today")
      expect(getAuthRedirect("/forgot-password", mockUser)).toBe("/today")
    })
  })
})
