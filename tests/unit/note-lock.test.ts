import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Note } from "@/types/database"
import { hashPassword, verifyPassword } from "@/lib/notes/crypto"
import { filterNotes, getNoteSnippet } from "@/lib/notes/utils"
import { getNoteMetadata } from "@/lib/search/utils"
import type { SearchNoteResult } from "@/lib/search/types"

// Supabase mock spies
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
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

describe("Note Password Locking & Search Privacy Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe("1. Password Cryptography & Constant-Time Verification", () => {
    it("hashes password with random salt and verifies correct password", () => {
      const password = "SuperSecretPassword123!"
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)

      // Different random salt on each hash
      expect(hash1).not.toBe(hash2)
      expect(hash1).toContain(":")

      // Verification succeeds
      expect(verifyPassword(password, hash1)).toBe(true)
      expect(verifyPassword(password, hash2)).toBe(true)
    })

    it("rejects incorrect password", () => {
      const password = "CorrectPassword"
      const hash = hashPassword(password)

      expect(verifyPassword("WrongPassword", hash)).toBe(false)
      expect(verifyPassword("correctpassword", hash)).toBe(false)
      expect(verifyPassword("", hash)).toBe(false)
    })

    it("safely handles null, undefined, or malformed hashes", () => {
      expect(verifyPassword("test", null)).toBe(false)
      expect(verifyPassword("test", undefined)).toBe(false)
      expect(verifyPassword("test", "malformed_hash_no_colon")).toBe(false)
      expect(verifyPassword("test", ":")).toBe(false)
    })
  })

  describe("2. Server Action: lockNote", () => {
    it("locks a note and stores password hash under session user ID", async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "note-1", is_locked: true },
                error: null,
              }),
            }),
          }),
        }),
      })

      const { lockNote } = await import("@/app/(app)/notes/actions")
      const res = await lockNote({
        id: "00000000-0000-0000-0000-000000000001",
        password: "MySecurePassword",
      })

      expect(res.success).toBe(true)
      expect(res.data?.is_locked).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_locked: true,
          password_hash: expect.stringMatching(/^[0-9a-f]+:[0-9a-f]+$/),
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith("/notes")
    })

    it("rejects lock request with empty password", async () => {
      const { lockNote } = await import("@/app/(app)/notes/actions")
      const res = await lockNote({
        id: "00000000-0000-0000-0000-000000000001",
        password: "",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Password is required.")
    })
  })

  describe("3. Server Action: unlockNote", () => {
    it("returns content when correct password is provided", async () => {
      const password = "SecretNotePassword"
      const hash = hashPassword(password)
      const lockedNote = {
        id: "00000000-0000-0000-0000-000000000001",
        content: "Top secret content that was locked",
        is_locked: true,
        password_hash: hash,
      }

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: lockedNote,
              error: null,
            }),
          }),
        }),
      })

      const { unlockNote } = await import("@/app/(app)/notes/actions")
      const res = await unlockNote({
        id: lockedNote.id,
        password,
      })

      expect(res.success).toBe(true)
      expect(res.data?.content).toBe(lockedNote.content)
    })

    it("rejects unlock attempt when incorrect password is provided", async () => {
      const hash = hashPassword("ActualPassword")
      const lockedNote = {
        id: "00000000-0000-0000-0000-000000000001",
        content: "Top secret content",
        is_locked: true,
        password_hash: hash,
      }

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: lockedNote,
              error: null,
            }),
          }),
        }),
      })

      const { unlockNote } = await import("@/app/(app)/notes/actions")
      const res = await unlockNote({
        id: lockedNote.id,
        password: "WrongPassword123",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Incorrect password.")
      expect(res.data).toBeUndefined()
    })
  })

  describe("4. Server Action: removeNoteLock", () => {
    it("removes lock when correct password is provided", async () => {
      const password = "LockPassword"
      const hash = hashPassword(password)
      const lockedNote = {
        id: "00000000-0000-0000-0000-000000000001",
        is_locked: true,
        password_hash: hash,
      }

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: lockedNote,
              error: null,
            }),
          }),
        }),
      })

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: lockedNote.id, is_locked: false },
                error: null,
              }),
            }),
          }),
        }),
      })

      const { removeNoteLock } = await import("@/app/(app)/notes/actions")
      const res = await removeNoteLock({
        id: lockedNote.id,
        password,
      })

      expect(res.success).toBe(true)
      expect(res.data?.is_locked).toBe(false)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_locked: false,
          password_hash: null,
        })
      )
    })

    it("rejects lock removal with wrong password", async () => {
      const hash = hashPassword("RealPassword")
      const lockedNote = {
        id: "00000000-0000-0000-0000-000000000001",
        is_locked: true,
        password_hash: hash,
      }

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: lockedNote,
              error: null,
            }),
          }),
        }),
      })

      const { removeNoteLock } = await import("@/app/(app)/notes/actions")
      const res = await removeNoteLock({
        id: lockedNote.id,
        password: "IncorrectPassword",
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Incorrect password.")
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe("5. Locked Note Privacy in Search Results", () => {
    const regularNote: Note = {
      id: "1",
      user_id: "user-1",
      title: "Quarterly Strategy",
      content: "Discuss confidential acquisitions and product plans.",
      created_at: "",
      updated_at: "",
      is_locked: false,
    }

    const lockedNote: Note = {
      id: "2",
      user_id: "user-1",
      title: "Bank Accounts and Passwords",
      content: "Secret bank pin is 9876. Confidential account number is 123456.",
      created_at: "",
      updated_at: "",
      is_locked: true,
    }

    describe("filterNotes (client-side filtering)", () => {
      it("allows searching locked notes by their title", () => {
        const matches = filterNotes([regularNote, lockedNote], "bank accounts")
        expect(matches.map((n) => n.id)).toEqual(["2"])
      })

      it("never matches locked notes by their content", () => {
        // "9876" and "confidential account" are only in the content of the locked note
        const pinMatches = filterNotes([regularNote, lockedNote], "9876")
        expect(pinMatches).toHaveLength(0)

        const accountMatches = filterNotes([regularNote, lockedNote], "account number")
        expect(accountMatches).toHaveLength(0)

        // But regular note content is searchable normally
        const strategyMatches = filterNotes([regularNote, lockedNote], "acquisitions")
        expect(strategyMatches.map((n) => n.id)).toEqual(["1"])
      })
    })

    describe("getNoteSnippet and getNoteMetadata", () => {
      it("getNoteSnippet returns 'Locked note' when note is locked", () => {
        expect(getNoteSnippet("Highly sensitive password text", 90, true)).toBe("Locked note")
        expect(getNoteSnippet("Normal text", 90, false)).toBe("Normal text")
      })

      it("getNoteMetadata returns 'Locked note' for locked note search results", () => {
        const lockedSearchResult: SearchNoteResult = {
          id: "lock-1",
          title: "Personal Vault",
          content: "",
          updated_at: new Date().toISOString(),
          is_locked: true,
        }

        const meta = getNoteMetadata(lockedSearchResult)
        expect(meta.contentSnippet).toBe("Locked note")
      })

      it("getNoteMetadata returns markdown snippet for unlocked notes", () => {
        const normalSearchResult: SearchNoteResult = {
          id: "norm-1",
          title: "Grocery List",
          content: "Milk, bread, bananas",
          updated_at: new Date().toISOString(),
          is_locked: false,
        }

        const meta = getNoteMetadata(normalSearchResult)
        expect(meta.contentSnippet).toBe("Milk, bread, bananas")
      })
    })
  })

  describe("6. getNotesPageData Sanitization", () => {
    it("never delivers content or password_hash of locked notes in initial page load payload", async () => {
      const mockNotes: Note[] = [
        {
          id: "note-regular",
          user_id: "user-12345",
          title: "Public Note",
          content: "Open content",
          is_locked: false,
          created_at: "",
          updated_at: "",
        },
        {
          id: "note-locked",
          user_id: "user-12345",
          title: "Locked Note",
          content: "SECRET CONTENT NEVER EXPOSED",
          is_locked: true,
          password_hash: "salt:hash",
          created_at: "",
          updated_at: "",
        },
      ]

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockNotes,
            error: null,
          }),
        }),
      })

      const { getNotesPageData } = await import("@/lib/notes/data")
      const result = await getNotesPageData()

      expect(result).not.toBeNull()
      const notes = result?.notes || []
      expect(notes).toHaveLength(2)

      // Regular note has content
      const reg = notes.find((n) => n.id === "note-regular")
      expect(reg?.content).toBe("Open content")
      expect(reg?.is_locked).toBe(false)

      // Locked note content is completely empty and password_hash is not present
      const locked = notes.find((n) => n.id === "note-locked")
      expect(locked?.content).toBe("")
      expect(locked?.is_locked).toBe(true)
      expect(locked?.password_hash).toBeUndefined()
    })
  })
})
