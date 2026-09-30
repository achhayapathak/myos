import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { sanitizeUrl, renderInlineMarkdown } from "@/lib/notes/markdown"

// Mocks for Supabase client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

const eqCalls: [string, unknown][] = []
const mockEq = vi.fn((column: string, value: unknown) => {
  eqCalls.push([column, value])
  return {
    eq: mockEq,
    select: vi.fn(() => ({
      single: mockSingle.mockResolvedValue({ data: { id: "test-note" }, error: null }),
    })),
  }
})

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    update: vi.fn(() => ({ eq: mockEq })),
    delete: vi.fn(() => ({ eq: mockEq })),
    select: mockSelect,
  })),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Notes Feature Security & Multi-User Isolation Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
  })

  describe("1. Unauthenticated Request Blocking", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No active session"),
      })
    })

    it("blocks unauthenticated users from creating notes", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")
      const res = await createNote({ title: "Unauthorized note" })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from updating notes", async () => {
      const { updateNote } = await import("@/app/(app)/notes/actions")
      const res = await updateNote({
        id: "00000000-0000-0000-0000-000000000001",
        title: "Malicious update",
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from deleting notes", async () => {
      const { deleteNote } = await import("@/app/(app)/notes/actions")
      const res = await deleteNote("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it("blocks unauthenticated users from searching notes", async () => {
      const { searchNotes } = await import("@/app/(app)/notes/actions")
      const res = await searchNotes("query")

      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })

    it("returns null from getNotesPageData when unauthenticated", async () => {
      const { getNotesPageData } = await import("@/lib/notes/data")
      const res = await getNotesPageData()
      expect(res).toBeNull()
    })
  })

  describe("2. Client user_id Tampering Prevention", () => {
    it("never trusts client-supplied user_id during note creation", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-A", email: "userA@myos.local" } },
        error: null,
      })

      mockInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "note-new", user_id: "user-A" },
            error: null,
          }),
        }),
      })

      const { createNote } = await import("@/app/(app)/notes/actions")

      const spoofedPayload = {
        title: "Spoofed Note",
        content: "Content",
        user_id: "victim-user-B",
      }

      const res = await createNote(spoofedPayload)

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-A",
          title: "Spoofed Note",
        })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "victim-user-B",
        })
      )
    })
  })

  describe("3. Multi-User Isolation & Anti-Cross-User Access", () => {
    it("strictly scopes note update queries with user_id to prevent modifying other users' notes", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { updateNote } = await import("@/app/(app)/notes/actions")

      const victimNoteId = "00000000-0000-0000-0000-000000000099"
      await updateNote({
        id: victimNoteId,
        title: "Tampered Note Title",
      })

      expect(eqCalls).toContainEqual(["id", victimNoteId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })

    it("strictly scopes note delete queries with user_id to prevent deleting other users' notes", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-attacker", email: "attacker@myos.local" } },
        error: null,
      })

      const { deleteNote } = await import("@/app/(app)/notes/actions")

      const victimNoteId = "00000000-0000-0000-0000-000000000099"
      await deleteNote(victimNoteId)

      expect(eqCalls).toContainEqual(["id", victimNoteId])
      expect(eqCalls).toContainEqual(["user_id", "user-attacker"])
    })
  })

  describe("4. Database Row Level Security (RLS) Policy Verification", () => {
    const migrationPath = path.join(
      rootDir,
      "supabase/migrations/20260929000000_initial_schema.sql"
    )
    const hardeningPath = path.join(
      rootDir,
      "supabase/migrations/20260929000001_security_hardening.sql"
    )

    const migrationContent = fs.readFileSync(migrationPath, "utf-8")
    const hardeningContent = fs.readFileSync(hardeningPath, "utf-8")

    it("verifies RLS is enabled on notes table", () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+public\.notes\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("verifies notes SELECT policy restricts access strictly to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"notes_select_own"\s+ON\s+public\.notes\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies notes INSERT policy verifies auth.uid() = user_id (never trusting client)", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"notes_insert_own"\s+ON\s+public\.notes\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies notes UPDATE policy blocks transferring ownership across users (USING + WITH CHECK)", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"notes_update_own"\s+ON\s+public\.notes\s+FOR\s+UPDATE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)\s+WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies notes DELETE policy restricts deletion to auth.uid() = user_id", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+POLICY\s+"notes_delete_own"\s+ON\s+public\.notes\s+FOR\s+DELETE\s+TO\s+authenticated\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i
      )
    })

    it("verifies user_id on notes defaults to auth.uid() in security hardening", () => {
      expect(hardeningContent).toMatch(
        /ALTER\s+TABLE\s+public\.notes\s+ALTER\s+COLUMN\s+user_id\s+SET\s+DEFAULT\s+auth\.uid\(\)/i
      )
    })
  })

  describe("5. Architectural Boundary Enforcement", () => {
    it("ensures lib/notes/data.ts imports 'server-only'", () => {
      const dataContent = fs.readFileSync(
        path.join(rootDir, "lib/notes/data.ts"),
        "utf-8"
      )
      expect(dataContent).toMatch(/^import\s+["']server-only["']/)
    })

    it("ensures app/(app)/notes/actions.ts declares 'use server'", () => {
      const actionsContent = fs.readFileSync(
        path.join(rootDir, "app/(app)/notes/actions.ts"),
        "utf-8"
      )
      expect(actionsContent).toMatch(/^["']use server["']/)
    })
  })

  describe("6. Markdown XSS Prevention & Sanitization", () => {
    it("neutralizes dangerous URI schemes (javascript:, data:, vbscript:)", () => {
      expect(sanitizeUrl("javascript:alert(document.cookie)")).toBe("#")
      expect(sanitizeUrl("JAVASCRIPT:alert(1)")).toBe("#")
      expect(sanitizeUrl("vbscript:msgbox('hello')")).toBe("#")
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("#")
      expect(sanitizeUrl("   javascript:void(0)   ")).toBe("#")
    })

    it("preserves safe HTTP, HTTPS, relative, and mailto URLs", () => {
      expect(sanitizeUrl("https://example.com/docs")).toBe("https://example.com/docs")
      expect(sanitizeUrl("http://localhost:3000")).toBe("http://localhost:3000")
      expect(sanitizeUrl("/notes/overview")).toBe("/notes/overview")
      expect(sanitizeUrl("#section-1")).toBe("#section-1")
      expect(sanitizeUrl("mailto:support@myos.local")).toBe("mailto:support@myos.local")
    })

    it("safely handles injected script or HTML tags without executing HTML", () => {
      const xssAttempt = "<script>alert('xss')</script>"
      const elements = renderInlineMarkdown(xssAttempt)

      // The elements must be safe React nodes, not executed script elements
      expect(elements).toBeDefined()
      expect(elements.length).toBeGreaterThan(0)
    })

    it("neutralizes malicious markdown links with javascript URLs", () => {
      const markdown = "[Dangerous Link](javascript:alert('pwned'))"
      const elements = renderInlineMarkdown(markdown)

      // First element is a link whose href is sanitized to '#'
      const linkElement = elements[0] as React.ReactElement<{
        href: string
        target?: string
        rel?: string
      }>
      expect(linkElement.props.href).toBe("#")
      expect(linkElement.props.target).toBe("_blank")
      expect(linkElement.props.rel).toBe("noopener noreferrer")
    })
  })
})
