import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Note } from "@/types/database"
import {
  deriveNoteTitle,
  getNoteSnippet,
  formatNoteUpdatedTime,
  filterNotes,
  getNoteStats,
} from "@/lib/notes/utils"

// Supabase mock spies
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockRevalidatePath = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  })),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

const mockUser = {
  id: "user-12345",
  email: "owner@myos.local",
}

const mockNote: Note = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-12345",
  title: "Architecture Decisions",
  content: "# Overview\n\nNext.js App Router and Supabase RLS.",
  created_at: "2026-09-30T10:00:00.000Z",
  updated_at: "2026-09-30T10:00:00.000Z",
}

describe("Note Server Actions & Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Setup insert chain: .insert().select().single()
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle.mockResolvedValue({ data: mockNote, error: null }),
      }),
    })

    // Setup update chain: .update().eq().eq().select().single()
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockNote, error: null }),
          }),
        }),
      }),
    })

    // Setup delete chain: .delete().eq().eq()
    mockDelete.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    // Setup select chain for search
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({ data: [mockNote], error: null }),
        }),
      }),
    })
  })

  describe("1. createNote", () => {
    it("creates a new note with user identity and explicit title", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")

      const res = await createNote({
        title: "Product Roadmap",
        content: "Drafting the roadmap for Q4.",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          title: "Product Roadmap",
          content: "Drafting the roadmap for Q4.",
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/notes")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("derives title from the first line of markdown content when title is omitted", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")

      const res = await createNote({
        content: "# Meeting Minutes\nDiscussion regarding database indexes.",
      })

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          title: "Meeting Minutes",
          content: "# Meeting Minutes\nDiscussion regarding database indexes.",
        })
      )
    })

    it("falls back to 'Untitled Note' if both title and content are empty", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")

      const res = await createNote({})

      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-12345",
          title: "Untitled Note",
          content: "",
        })
      )
    })
  })

  describe("2. updateNote", () => {
    it("updates note title, content, and updated_at with user constraint", async () => {
      const { updateNote } = await import("@/app/(app)/notes/actions")

      const res = await updateNote({
        id: "00000000-0000-0000-0000-000000000001",
        title: "Updated Title",
        content: "Updated Content",
      })

      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
          content: "Updated Content",
          updated_at: expect.any(String),
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/notes")
    })

    it("rejects invalid note UUID format", async () => {
      const { updateNote } = await import("@/app/(app)/notes/actions")

      const res = await updateNote({
        id: "invalid-id",
        title: "Test",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Invalid note ID format.")
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it("rejects empty title when title is explicitly updated", async () => {
      const { updateNote } = await import("@/app/(app)/notes/actions")

      const res = await updateNote({
        id: "00000000-0000-0000-0000-000000000001",
        title: "   ",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Note title cannot be empty.")
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe("3. deleteNote", () => {
    it("deletes note strictly matching id and user_id", async () => {
      const { deleteNote } = await import("@/app/(app)/notes/actions")

      const res = await deleteNote("00000000-0000-0000-0000-000000000001")

      expect(res.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockRevalidatePath).toHaveBeenCalledWith("/notes")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/today")
    })

    it("rejects empty note ID", async () => {
      const { deleteNote } = await import("@/app/(app)/notes/actions")

      const res = await deleteNote("")

      expect(res.success).toBe(false)
      expect(res.error).toBe("Note ID is required.")
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe("4. searchNotes", () => {
    it("searches notes for authenticated user", async () => {
      const { searchNotes } = await import("@/app/(app)/notes/actions")

      const res = await searchNotes("Architecture")

      expect(res.success).toBe(true)
      expect(res.data).toEqual([mockNote])
    })
  })

  describe("5. Note Utilities", () => {
    describe("deriveNoteTitle", () => {
      it("derives clean title without markdown tokens", () => {
        expect(deriveNoteTitle("# My Project Title\nSome content")).toBe("My Project Title")
        expect(deriveNoteTitle("## Secondary Heading\nBody")).toBe("Secondary Heading")
        expect(deriveNoteTitle("- [ ] Todo item\nBody")).toBe("Todo item")
        expect(deriveNoteTitle("> Quote header\nBody")).toBe("Quote header")
        expect(deriveNoteTitle("")).toBe("Untitled Note")
        expect(deriveNoteTitle("   \n\n  \n")).toBe("Untitled Note")
      })
    })

    describe("getNoteSnippet", () => {
      it("strips markdown formatting and returns clean preview snippet", () => {
        const markdown = "# Title\nThis is **bold** and *italic* with [a link](https://test.com)."
        const snippet = getNoteSnippet(markdown, 50)
        expect(snippet).not.toContain("#")
        expect(snippet).not.toContain("**")
        expect(snippet).toContain("bold")
        expect(snippet).toContain("italic")
        expect(snippet).toContain("a link")
      })
    })

    describe("formatNoteUpdatedTime", () => {
      it("formats relative timestamps accurately", () => {
        const now = new Date()
        expect(formatNoteUpdatedTime(now.toISOString())).toBe("Just now")

        const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)
        expect(formatNoteUpdatedTime(tenMinAgo.toISOString())).toBe("10m ago")

        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
        expect(formatNoteUpdatedTime(twoHoursAgo.toISOString())).toBe("2h ago")
      })
    })

    describe("filterNotes", () => {
      const testNotes: Note[] = [
        {
          id: "1",
          user_id: "user-1",
          title: "System Architecture",
          content: "Postgres and Next.js",
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          user_id: "user-1",
          title: "Grocery List",
          content: "Milk, eggs, coffee",
          created_at: "",
          updated_at: "",
        },
      ]

      it("filters by title match case-insensitively", () => {
        const matches = filterNotes(testNotes, "architecture")
        expect(matches.map((n) => n.id)).toEqual(["1"])
      })

      it("filters by content match case-insensitively", () => {
        const matches = filterNotes(testNotes, "coffee")
        expect(matches.map((n) => n.id)).toEqual(["2"])
      })

      it("returns all notes when query is empty", () => {
        const matches = filterNotes(testNotes, "   ")
        expect(matches.length).toBe(2)
      })
    })

    describe("getNoteStats", () => {
      it("calculates accurate word and character counts", () => {
        const stats = getNoteStats("Hello world from MyOS")
        expect(stats.words).toBe(4)
        expect(stats.chars).toBe(21)
      })
    })
  })
})
