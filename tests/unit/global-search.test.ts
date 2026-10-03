import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  cleanMarkdownSnippet,
  getTaskMetadata,
  getNoteMetadata,
  getEventMetadata,
} from "@/lib/search/utils"
import { globalSearchAction } from "@/lib/search/actions"
import * as authModule from "@/lib/supabase/auth"
import * as serverClientModule from "@/lib/supabase/server"
import type {
  SearchTaskResult,
  SearchNoteResult,
  SearchEventResult,
} from "@/lib/search/types"

describe("Global Search Specification Tests", () => {
  const rootDir = process.cwd()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("1. PostgreSQL Optimization & Migration Schema", () => {
    it("ensures migration 20261003000001_search_indexes.sql exists with pg_trgm and GIN indexes", () => {
      const migrationPath = path.join(
        rootDir,
        "supabase/migrations/20261003000001_search_indexes.sql"
      )
      expect(fs.existsSync(migrationPath)).toBe(true)

      const content = fs.readFileSync(migrationPath, "utf-8")

      // Trigram extension
      expect(content).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_trgm/i)

      // Tasks indexes
      expect(content).toMatch(/idx_tasks_title_trgm[\s\S]*?USING\s+gin\s*\(\s*title\s+gin_trgm_ops\s*\)/i)
      expect(content).toMatch(/idx_tasks_description_trgm[\s\S]*?USING\s+gin\s*\(\s*description\s+gin_trgm_ops\s*\)/i)

      // Notes indexes
      expect(content).toMatch(/idx_notes_title_trgm[\s\S]*?USING\s+gin\s*\(\s*title\s+gin_trgm_ops\s*\)/i)
      expect(content).toMatch(/idx_notes_content_trgm[\s\S]*?USING\s+gin\s*\(\s*content\s+gin_trgm_ops\s*\)/i)

      // Calendar Events indexes
      expect(content).toMatch(/idx_events_title_trgm[\s\S]*?USING\s+gin\s*\(\s*title\s+gin_trgm_ops\s*\)/i)
      expect(content).toMatch(/idx_events_description_trgm[\s\S]*?USING\s+gin\s*\(\s*description\s+gin_trgm_ops\s*\)/i)
    })
  })

  describe("2. Metadata Formatting and Markdown Snippet Extraction", () => {
    it("strips markdown headers, code, and links to produce clean snippets", () => {
      const rawMarkdown = "# Project Update\n\nHere is the **critical** update with [Docs Link](https://example.com) and `inline code`."
      const snippet = cleanMarkdownSnippet(rawMarkdown, 100)

      expect(snippet).not.toContain("#")
      expect(snippet).not.toContain("**")
      expect(snippet).not.toContain("`")
      expect(snippet).not.toContain("[Docs Link]")
      expect(snippet).toContain("Project Update")
      expect(snippet).toContain("critical update with Docs Link and inline code.")
    })

    it("truncates long snippets cleanly with ellipsis", () => {
      const longText = "This is a very long text intended to test maximum length truncation in the search result snippet utility."
      const truncated = cleanMarkdownSnippet(longText, 30)

      expect(truncated.endsWith("…")).toBe(true)
      expect(truncated.length).toBeLessThanOrEqual(32)
    })

    it("formats task metadata with human-readable status, priority, and due dates", () => {
      const task: SearchTaskResult = {
        id: "task-1",
        title: "Deploy Release v0.1",
        description: "**Urgent**: Verify production database migrations",
        status: "in_progress",
        priority: "high",
        due_at: new Date(Date.now() + 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      }

      const meta = getTaskMetadata(task)
      expect(meta.statusLabel).toBe("In Progress")
      expect(meta.priorityLabel).toBe("High")
      expect(meta.descriptionSnippet).toBe("Urgent: Verify production database migrations")
      expect(meta.dueLabel).toBeDefined()
    })

    it("formats note metadata with clean snippet and relative date", () => {
      const note: SearchNoteResult = {
        id: "note-1",
        title: "Sprint Planning",
        content: "### Action Items\n* Finish user search\n* Run Vitest harness",
        updated_at: new Date().toISOString(),
      }

      const meta = getNoteMetadata(note)
      expect(meta.contentSnippet).toContain("Action Items Finish user search Run Vitest harness")
      expect(meta.updatedLabel).toBeDefined()
    })

    it("formats calendar event metadata with date, time, and all-day indicators", () => {
      const eventTimed: SearchEventResult = {
        id: "ev-1",
        title: "Team Sync",
        description: "Weekly sync meeting",
        start_at: "2026-10-04T10:00:00.000Z",
        end_at: "2026-10-04T11:00:00.000Z",
        all_day: false,
        updated_at: new Date().toISOString(),
      }

      const metaTimed = getEventMetadata(eventTimed, "UTC")
      expect(metaTimed.timeLabel).toContain("Oct 4")
      expect(metaTimed.timeLabel).toContain("10:00 AM – 11:00 AM")
      expect(metaTimed.descriptionSnippet).toBe("Weekly sync meeting")

      const eventAllDay: SearchEventResult = {
        id: "ev-2",
        title: "Company Holiday",
        description: null,
        start_at: "2026-10-05T00:00:00.000Z",
        end_at: null,
        all_day: true,
        updated_at: new Date().toISOString(),
      }

      const metaAllDay = getEventMetadata(eventAllDay, "UTC")
      expect(metaAllDay.timeLabel).toBe("All day · Oct 5")
      expect(metaAllDay.descriptionSnippet).toBeNull()
    })
  })

  describe("3. Server-Side Global Search Security & Execution", () => {
    it("rejects unauthenticated requests without session", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(null)

      const result = await globalSearchAction("meeting")
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("rejects search queries that exceed maximum character limits", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "user-123",
        email: "test@myos.local",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      })

      const overlyLongQuery = "a".repeat(150)
      const result = await globalSearchAction(overlyLongQuery)
      expect(result.success).toBe(false)
      expect(result.error).toContain("Invalid search query")
    })

    it("returns empty results immediately for blank or whitespace queries without hitting DB", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "user-123",
        email: "test@myos.local",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      })

      const createClientSpy = vi.spyOn(serverClientModule, "createClient")

      const result = await globalSearchAction("   ")
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ tasks: [], notes: [], events: [] })
      expect(createClientSpy).not.toHaveBeenCalled()
    })

    it("enforces user isolation strictly and queries PostgreSQL tasks, notes, and events", async () => {
      vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: "user-999",
        email: "owner@myos.local",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      })

      const mockTasks = [
        {
          id: "task-10",
          title: "Quarterly Review",
          description: "Prepare slides",
          status: "todo",
          priority: "high",
          due_at: null,
          updated_at: new Date().toISOString(),
        },
      ]

      const mockNotes = [
        {
          id: "note-20",
          title: "Review Notes",
          content: "Key metrics",
          updated_at: new Date().toISOString(),
        },
      ]

      const mockEvents = [
        {
          id: "ev-30",
          title: "Quarterly Review Meeting",
          description: "All hands meeting",
          start_at: new Date().toISOString(),
          end_at: null,
          all_day: false,
          updated_at: new Date().toISOString(),
        },
      ]

      const mockFrom = vi.fn((table: string) => {
        let returnData: unknown[] = []
        if (table === "tasks") returnData = mockTasks
        if (table === "notes") returnData = mockNotes
        if (table === "events") returnData = mockEvents

        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, val: string) => {
              expect(field).toBe("user_id")
              expect(val).toBe("user-999") // Strictly derived from auth session
              return {
                or: vi.fn((filterStr: string) => {
                  expect(filterStr).toContain("Review")
                  return {
                    order: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data: returnData,
                        error: null,
                      }),
                    })),
                  }
                }),
              }
            }),
          })),
        }
      })

      vi.spyOn(serverClientModule, "createClient").mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof serverClientModule.createClient>>)

      const res = await globalSearchAction("Review")
      expect(res.success).toBe(true)
      expect(res.data?.tasks).toHaveLength(1)
      expect(res.data?.tasks[0]?.title).toBe("Quarterly Review")
      expect(res.data?.notes).toHaveLength(1)
      expect(res.data?.notes[0]?.title).toBe("Review Notes")
      expect(res.data?.events).toHaveLength(1)
      expect(res.data?.events[0]?.title).toBe("Quarterly Review Meeting")
    })
  })

  describe("4. Direct Result Navigation Across Routes", () => {
    it("ensures TasksView handles myos:select-task and ?taskId= URL parameter", () => {
      const tasksViewPath = path.join(rootDir, "components/tasks/tasks-view.tsx")
      const content = fs.readFileSync(tasksViewPath, "utf-8")

      expect(content).toContain("myos:select-task")
      expect(content).toContain("taskId")
      expect(content).toContain("setEditingTask(found)")
    })

    it("ensures NotesView handles myos:select-note and ?noteId= URL parameter", () => {
      const notesViewPath = path.join(rootDir, "components/notes/notes-view.tsx")
      const content = fs.readFileSync(notesViewPath, "utf-8")

      expect(content).toContain("myos:select-note")
      expect(content).toContain("noteId")
      expect(content).toContain("setSelectedNoteId(noteId)")
      expect(content).toContain("setMobileView(\"editor\")")
    })

    it("ensures CalendarView handles myos:select-event and ?eventId= URL parameter", () => {
      const calendarViewPath = path.join(rootDir, "components/calendar/calendar-view.tsx")
      const content = fs.readFileSync(calendarViewPath, "utf-8")

      expect(content).toContain("myos:select-event")
      expect(content).toContain("eventId")
      expect(content).toContain("setSelectedEvent(found)")
      expect(content).toContain("setDialogOpen(true)")
      expect(content).toContain("gotoDate(found.start_at)")
    })
  })

  describe("5. Command Palette UI & Keyboard-First Search Integration", () => {
    it("verifies CommandPalette contains debounced search, grouping, and direct dispatchers", () => {
      const palettePath = path.join(rootDir, "components/command-palette.tsx")
      const content = fs.readFileSync(palettePath, "utf-8")

      // Debounce and server action call
      expect(content).toContain("globalSearchAction(trimmed)")
      expect(content).toContain("setTimeout(")
      expect(content).toContain("250")

      // Group headings for Tasks, Notes, and Calendar Events
      expect(content).toContain("heading={`Tasks (${searchResults.tasks.length})`}")
      expect(content).toContain("heading={`Notes (${searchResults.notes.length})`}")
      expect(content).toContain("heading={`Calendar Events (${searchResults.events.length})`}")

      // Direct selection handlers
      expect(content).toContain("handleSelectTask")
      expect(content).toContain("handleSelectNote")
      expect(content).toContain("handleSelectEvent")
      expect(content).toContain("myos:select-task")
      expect(content).toContain("myos:select-note")
      expect(content).toContain("myos:select-event")

      // Cmd/Ctrl + K shortcut preservation
      expect(content).toMatch(/\(e\.metaKey\s*\|\|\s*e\.ctrlKey\)\s*&&\s*\(e\.key\s*===\s*["']k["']\s*\|\|\s*e\.key\s*===\s*["']K["']\)/)
    })
  })
})
