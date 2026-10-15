import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock Resend SDK
const mockSend = vi.fn()

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(function (this: { emails: { send: typeof mockSend } }) {
      this.emails = {
        send: mockSend,
      }
    }),
  }
})

describe("Resend Email Notifications for Waitlist Interest", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("1. sendWaitlistNotification", () => {
    it("skips notification gracefully when RESEND_API_KEY is missing", async () => {
      delete process.env.RESEND_API_KEY
      const { sendWaitlistNotification } = await import("@/lib/email/resend")

      const result = await sendWaitlistNotification({ email: "lead@example.com" })

      expect(result.success).toBe(false)
      expect(result.error).toContain("RESEND_API_KEY")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends notification email to info@achhaya.com when key is configured", async () => {
      process.env.RESEND_API_KEY = "re_test_12345"
      mockSend.mockResolvedValueOnce({
        data: { id: "resend_msg_001" },
        error: null,
      })

      const { sendWaitlistNotification } = await import("@/lib/email/resend")

      const result = await sendWaitlistNotification({
        email: "founder@startup.io",
        ip: "203.0.113.195",
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("resend_msg_001")
      expect(result.recipient).toBe("info@achhaya.com")
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["info@achhaya.com"],
          subject: expect.stringContaining("founder@startup.io"),
          html: expect.stringContaining("founder@startup.io"),
          text: expect.stringContaining("founder@startup.io"),
        })
      )
    })

    it("marks subject line as repeat interest for duplicate submissions", async () => {
      process.env.RESEND_API_KEY = "re_test_12345"
      mockSend.mockResolvedValueOnce({
        data: { id: "resend_msg_002" },
        error: null,
      })

      const { sendWaitlistNotification } = await import("@/lib/email/resend")

      const result = await sendWaitlistNotification({
        email: "repeat@startup.io",
        isDuplicate: true,
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("[Repeat Interest]"),
        })
      )
    })

    it("handles Resend sandbox restriction by falling back to account owner email", async () => {
      process.env.RESEND_API_KEY = "re_test_12345"

      // First call fails with sandbox restriction
      mockSend.mockResolvedValueOnce({
        data: null,
        error: {
          name: "validation_error",
          message:
            "You can only send testing emails to your own email address (achhaya.pathak.dev@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains",
          statusCode: 403,
        },
      })

      // Fallback retry call succeeds
      mockSend.mockResolvedValueOnce({
        data: { id: "resend_sandbox_fallback_003" },
        error: null,
      })

      const { sendWaitlistNotification } = await import("@/lib/email/resend")

      const result = await sendWaitlistNotification({
        email: "sandbox.test@example.com",
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("resend_sandbox_fallback_003")
      expect(result.recipient).toBe("achhaya.pathak.dev@gmail.com")
      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          to: ["achhaya.pathak.dev@gmail.com"],
          subject: expect.stringContaining("[Dev Sandbox]"),
        })
      )
    })

    it("handles unexpected errors without throwing uncaught exceptions", async () => {
      process.env.RESEND_API_KEY = "re_test_12345"
      mockSend.mockRejectedValueOnce(new Error("Network connection dropped"))

      const { sendWaitlistNotification } = await import("@/lib/email/resend")

      const result = await sendWaitlistNotification({
        email: "error.test@example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Network connection dropped")
    })
  })
})
