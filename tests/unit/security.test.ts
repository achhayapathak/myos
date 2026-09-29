import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import nextConfig from "@/next.config"

// Top-level mock for Supabase server client
const mockExchange = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchange,
    },
  })),
}))

describe("Application Security Controls", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. HTTP Security Headers (Clickjacking & Transport Security)", () => {
    it("configures strict security headers in next.config.ts", async () => {
      expect(nextConfig.headers).toBeDefined()
      if (!nextConfig.headers) return

      const headersConfig = await nextConfig.headers()
      expect(headersConfig).toHaveLength(1)
      expect(headersConfig[0].source).toBe("/:path*")

      const headers = headersConfig[0].headers
      const headerMap = Object.fromEntries(
        headers.map((h) => [h.key.toLowerCase(), h.value])
      )

      expect(headerMap["x-frame-options"]).toBe("DENY")
      expect(headerMap["x-content-type-options"]).toBe("nosniff")
      expect(headerMap["referrer-policy"]).toBe("strict-origin-when-cross-origin")
      expect(headerMap["content-security-policy"]).toContain("frame-ancestors 'none'")
      expect(headerMap["strict-transport-security"]).toContain("max-age=31536000")
      expect(headerMap["permissions-policy"]).toContain("camera=()")
    })
  })

  describe("2. Server/Client Boundary Enforcement", () => {
    it("ensures unsafe lib/supabase/index.ts barrel file is removed", () => {
      const barrelPath = path.join(rootDir, "lib/supabase/index.ts")
      expect(fs.existsSync(barrelPath)).toBe(false)
    })

    it("ensures server.ts and admin.ts contain import 'server-only'", () => {
      const serverContent = fs.readFileSync(
        path.join(rootDir, "lib/supabase/server.ts"),
        "utf-8"
      )
      const adminContent = fs.readFileSync(
        path.join(rootDir, "lib/supabase/admin.ts"),
        "utf-8"
      )
      const authContent = fs.readFileSync(
        path.join(rootDir, "lib/supabase/auth.ts"),
        "utf-8"
      )

      expect(serverContent).toMatch(/import\s+["']server-only["']/)
      expect(adminContent).toMatch(/import\s+["']server-only["']/)
      expect(authContent).toMatch(/import\s+["']server-only["']/)
    })
  })

  describe("3. Auth Callback Open-Redirect Sanitization", () => {
    it("rejects protocol-relative and external URLs, falling back to /today", async () => {
      mockExchange.mockResolvedValue({ error: null })
      const { GET } = await import("@/app/auth/callback/route")

      const maliciousNextValues = [
        "//attacker.com",
        "//evil.com/phishing",
        "/\\evil.com",
        "https://evil.com",
        "javascript:alert(1)",
      ]

      for (const badNext of maliciousNextValues) {
        const req = new Request(
          `http://localhost:3000/auth/callback?code=valid-code&next=${encodeURIComponent(badNext)}`
        )
        const response = await GET(req)
        const location = response.headers.get("location")
        expect(location).toBe("http://localhost:3000/today")
      }
    })

    it("accepts valid internal relative paths", async () => {
      mockExchange.mockResolvedValue({ error: null })
      const { GET } = await import("@/app/auth/callback/route")

      const validPaths = ["/today", "/reset-password", "/settings"]

      for (const validPath of validPaths) {
        const req = new Request(
          `http://localhost:3000/auth/callback?code=valid-code&next=${encodeURIComponent(validPath)}`
        )
        const response = await GET(req)
        const location = response.headers.get("location")
        expect(location).toBe(`http://localhost:3000${validPath}`)
      }
    })

    it("redirects to login with sanitized error parameter when code exchange fails", async () => {
      mockExchange.mockResolvedValue({ error: new Error("Code expired") })
      const { GET } = await import("@/app/auth/callback/route")

      const req = new Request("http://localhost:3000/auth/callback?code=expired-code")
      const response = await GET(req)
      const location = response.headers.get("location")
      expect(location).toBe("http://localhost:3000/login?error=invalid_recovery_code")
    })
  })
})
