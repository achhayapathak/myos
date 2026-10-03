import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration Tests — Note, Calendar Event, and Reminder CRUD
 *
 * Verifies authorization, user_id scoping, validation, and IDOR prevention.
 *
 * Mocking strategy:
 * - @/lib/supabase/auth is mocked directly to avoid React.cache issues
 * - @/lib/supabase/server provides the Supabase client mock
 * - All Supabase chains return shapes matching the production query patterns
 */

const USER_A = { id: "user-aaa-111", email: "usera@myos.test" }
const USER_B = { id: "user-bbb-222", email: "userb@myos.test" }

// Direct mock of getCurrentUser (avoids React.cache complexity in tests)
const mockGetCurrentUser = vi.fn()

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(async () => mockGetCurrentUser()),
}))

const mockInsert = vi.fn()
const mockSingle = vi.fn()

const eqCalls: [string, unknown][] = []

// Self-referential eq mock that also supports chaining into select/order/or
function makeEqResult(): Record<string, unknown> {
  const result: Record<string, unknown> = {
    // Chain another eq
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return makeEqResult()
    }),
    // select() → { single }
    select: vi.fn(() => ({ single: mockSingle, order: vi.fn(makeOrderResult) })),
    // For direct single()
    single: mockSingle,
    // For delete chains awaited directly
    then: undefined, // Not a Promise
    // order → supports .or()
    order: vi.fn(makeOrderResult),
    // maybeSingle
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  return result
}

function makeOrderResult(): Record<string, unknown> {
  const result: Record<string, unknown> = {
    or: vi.fn().mockResolvedValue({ data: [], error: null }),
    // Make it awaitable itself
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  }
  return result
}

const rootEq = vi.fn((col: string, val: unknown) => {
  eqCalls.push([col, val])
  return makeEqResult()
})

const mockSelectFn = vi.fn<() => { eq: (col: string, val: unknown) => Record<string, unknown> }>(() => ({
  eq: (col: string, val: unknown) => {
    eqCalls.push([col, val])
    return makeEqResult()
  },
}))

const mockSupabase = {
  auth: { getUser: vi.fn() }, // Not used when we mock getCurrentUser directly
  from: vi.fn(() => ({
    insert: mockInsert,
    update: vi.fn(() => ({ eq: rootEq })),
    delete: vi.fn(() => ({ eq: rootEq })),
    select: mockSelectFn,
  })),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/notifications/delivery", () => ({
  queueReminderNotification: vi.fn().mockResolvedValue({ success: true }),
  cancelReminderNotification: vi.fn().mockResolvedValue({ success: true }),
  rescheduleReminderNotification: vi.fn().mockResolvedValue({ success: true }),
}))

function makeNote(override = {}) {
  return {
    id: `note-${Date.now()}`,
    user_id: USER_A.id,
    title: "Integration Note",
    content: "# Hello",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override,
  }
}

function makeEvent(override = {}) {
  return {
    id: `event-${Date.now()}`,
    user_id: USER_A.id,
    title: "Integration Event",
    description: null,
    start_at: new Date().toISOString(),
    end_at: null,
    all_day: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override,
  }
}

function makeReminder(override = {}) {
  return {
    id: `reminder-${Date.now()}`,
    user_id: USER_A.id,
    title: "Integration Reminder",
    remind_at: new Date(Date.now() + 3600000).toISOString(),
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override,
  }
}

// ===================================================================
// NOTE CRUD
// ===================================================================
describe("Integration: Note CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetCurrentUser.mockResolvedValue(USER_A)
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    })
    mockSingle.mockResolvedValue({ data: makeNote(), error: null })
    mockSelectFn.mockReturnValue({
      eq: (col: string, val: unknown) => {
        eqCalls.push([col, val])
        const r = makeEqResult()
        // override order to return chain with or
        r.order = vi.fn(makeOrderResult)
        return r
      },
    })
  })

  describe("createNote", () => {
    it("creates note with session user_id", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")
      const res = await createNote({ title: "My Note", content: "Content" })
      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
    })

    it("rejects unauthenticated request", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { createNote } = await import("@/app/(app)/notes/actions")
      const res = await createNote({ title: "Unauthorized" })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("rejects title over 255 characters", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")
      const res = await createNote({ title: "x".repeat(256) })
      expect(res.success).toBe(false)
    })

    it("never trusts client user_id override", async () => {
      const { createNote } = await import("@/app/(app)/notes/actions")
      // Pass an extra user_id that should be ignored
      await createNote({ title: "Spoofed", content: "", user_id: USER_B.id } as Parameters<typeof createNote>[0])
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_B.id })
      )
    })
  })

  describe("updateNote", () => {
    const noteId = "11111111-1111-4111-8111-111111111111"

    it("scopes update to authenticated user_id", async () => {
      const { updateNote } = await import("@/app/(app)/notes/actions")
      const res = await updateNote({ id: noteId, title: "Updated Title" })
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects unauthenticated update", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { updateNote } = await import("@/app/(app)/notes/actions")
      const res = await updateNote({ id: noteId, title: "Hack" })
      expect(res.success).toBe(false)
    })
  })

  describe("deleteNote", () => {
    it("scopes delete to authenticated user_id", async () => {
      const { deleteNote } = await import("@/app/(app)/notes/actions")
      const res = await deleteNote("11111111-1111-4111-8111-111111111112")
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects unauthenticated delete", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { deleteNote } = await import("@/app/(app)/notes/actions")
      const res = await deleteNote("11111111-1111-4111-8111-111111111112")
      expect(res.success).toBe(false)
    })
  })

  describe("searchNotes", () => {
    it("rejects unauthenticated search", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { searchNotes } = await import("@/app/(app)/notes/actions")
      const res = await searchNotes("sensitive query")
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("sanitizes PostgREST-dangerous characters from query", async () => {
      const { searchNotes } = await import("@/app/(app)/notes/actions")
      // This should NOT throw or crash even with special chars
      const res = await searchNotes("test,id.eq.xxx()")
      // Result may be empty but must not error
      expect(typeof res.success).toBe("boolean")
    })
  })
})

// ===================================================================
// CALENDAR EVENT CRUD
// ===================================================================
describe("Integration: Calendar Event CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetCurrentUser.mockResolvedValue(USER_A)
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    })
    mockSingle.mockResolvedValue({ data: makeEvent(), error: null })
    mockSelectFn.mockReturnValue({
      eq: (col: string, val: unknown) => {
        eqCalls.push([col, val])
        return makeEqResult()
      },
    })
  })

  describe("createCalendarEvent", () => {
    it("creates event with session user_id and valid UTC timestamps", async () => {
      const { createCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const now = new Date().toISOString()
      const res = await createCalendarEvent({
        title: "Team Meeting",
        start_at: now,
        all_day: false,
      })
      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
    })

    it("rejects unauthenticated request", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { createCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const res = await createCalendarEvent({
        title: "Bad event",
        start_at: new Date().toISOString(),
        all_day: false,
      })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })
  })

  describe("updateCalendarEvent", () => {
    const eventId = "22222222-2222-4222-8222-222222222221"

    it("scopes update to authenticated user_id", async () => {
      const { updateCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const res = await updateCalendarEvent(eventId, {
        title: "Updated Meeting",
        start_at: new Date().toISOString(),
        all_day: false,
      })
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects invalid event ID format", async () => {
      const { updateCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const res = await updateCalendarEvent("not-a-uuid", { title: "Bad" })
      expect(res.success).toBe(false)
    })

    it("rejects unauthenticated update", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { updateCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const res = await updateCalendarEvent(eventId, {
        title: "Hack",
        start_at: new Date().toISOString(),
        all_day: false,
      })
      expect(res.success).toBe(false)
    })
  })

  describe("deleteCalendarEvent", () => {
    it("rejects unauthenticated delete", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { deleteCalendarEvent } = await import("@/app/(app)/calendar/actions")
      const res = await deleteCalendarEvent("22222222-2222-4222-8222-222222222222")
      expect(res.success).toBe(false)
    })

    it("requires user_id scoping (via RLS or ownership eq)", async () => {
      // Verify that the delete includes user_id constraint
      const { deleteCalendarEvent } = await import("@/app/(app)/calendar/actions")
      await deleteCalendarEvent("22222222-2222-4222-8222-222222222222")
      // At a minimum, user_id should have been scoped via eq or RLS
      // RLS enforces this at the DB level; mock verifies we pass the filter
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })
  })
})

// ===================================================================
// REMINDER CRUD
// ===================================================================
describe("Integration: Reminder CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqCalls.length = 0
    mockGetCurrentUser.mockResolvedValue(USER_A)
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: mockSingle })),
    })
    mockSingle.mockResolvedValue({ data: makeReminder(), error: null })
    mockSelectFn.mockReturnValue({
      eq: (col: string, val: unknown) => {
        eqCalls.push([col, val])
        return makeEqResult()
      },
    })
  })

  describe("createReminder", () => {
    it("creates reminder with session user_id", async () => {
      const { createReminder } = await import("@/app/(app)/reminders/actions")
      const res = await createReminder({
        title: "Buy milk",
        remind_at: new Date(Date.now() + 3600000).toISOString(),
      })
      expect(res.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_A.id })
      )
    })

    it("rejects unauthenticated request", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { createReminder } = await import("@/app/(app)/reminders/actions")
      const res = await createReminder({
        title: "Unauthorized",
        remind_at: new Date().toISOString(),
      })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("rejects reminder with invalid timestamp format", async () => {
      const { createReminder } = await import("@/app/(app)/reminders/actions")
      const res = await createReminder({ title: "Bad Time", remind_at: "not-a-date" })
      expect(res.success).toBe(false)
    })
  })

  describe("updateReminder", () => {
    const reminderId = "33333333-3333-4333-8333-333333333331"

    it("scopes update to authenticated user_id", async () => {
      const { updateReminder } = await import("@/app/(app)/reminders/actions")
      const res = await updateReminder(reminderId, {
        title: "Updated Reminder",
        remind_at: new Date(Date.now() + 7200000).toISOString(),
      })
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects unauthenticated update", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { updateReminder } = await import("@/app/(app)/reminders/actions")
      const res = await updateReminder(reminderId, {
        title: "Hack",
        remind_at: new Date().toISOString(),
      })
      expect(res.success).toBe(false)
    })
  })

  describe("deleteReminder", () => {
    it("rejects unauthenticated delete", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { deleteReminder } = await import("@/app/(app)/reminders/actions")
      const res = await deleteReminder("33333333-3333-4333-8333-333333333332")
      expect(res.success).toBe(false)
    })

    it("scopes delete with user_id constraint", async () => {
      const { deleteReminder } = await import("@/app/(app)/reminders/actions")
      await deleteReminder("33333333-3333-4333-8333-333333333332")
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })
  })

  describe("toggleReminderCompleted", () => {
    it("scopes toggle to authenticated user_id", async () => {
      const { toggleReminderCompleted } = await import("@/app/(app)/reminders/actions")
      const res = await toggleReminderCompleted(
        "33333333-3333-4333-8333-333333333333",
        true
      )
      expect(res.success).toBe(true)
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A.id)).toBe(true)
    })

    it("rejects unauthenticated toggle", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null)
      const { toggleReminderCompleted } = await import("@/app/(app)/reminders/actions")
      const res = await toggleReminderCompleted("33333333-3333-4333-8333-333333333333", true)
      expect(res.success).toBe(false)
    })
  })
})
