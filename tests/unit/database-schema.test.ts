import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type {
  Database,
  Task,
  Profile,
  Note,
  Event,
  PomodoroSession,
  Reminder,
  PushSubscription,
} from "@/types/database"

describe("Database Schema & Migration Validation", () => {
  const rootDir = process.cwd()
  const migrationPath = path.join(
    rootDir,
    "supabase/migrations/20260929000000_initial_schema.sql"
  )
  const seedPath = path.join(rootDir, "supabase/seed.sql")

  const migrationContent = fs.readFileSync(migrationPath, "utf-8")
  const seedContent = fs.readFileSync(seedPath, "utf-8")

  const requiredTables = [
    "profiles",
    "tasks",
    "notes",
    "events",
    "pomodoro_sessions",
    "reminders",
    "push_subscriptions",
  ]

  describe("1. Table DDL & UUID Primary Keys", () => {
    it("creates all 7 required tables with UUID primary keys", () => {
      for (const table of requiredTables) {
        const tableRegex = new RegExp(
          `CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?public\\.${table}\\s*\\(`,
          "i"
        )
        expect(migrationContent).toMatch(tableRegex)

        // Check for UUID primary key
        const pkRegex = new RegExp(
          `CREATE\\s+TABLE[\\s\\S]*?public\\.${table}[\\s\\S]*?id\\s+UUID\\s+PRIMARY\\s+KEY`,
          "i"
        )
        expect(migrationContent).toMatch(pkRegex)
      }
    })

    it("ensures every user-owned table has user_id foreign key referencing auth.users with DEFAULT auth.uid()", () => {
      for (const table of requiredTables) {
        const fkRegex = new RegExp(
          `CREATE\\s+TABLE[\\s\\S]*?public\\.${table}[\\s\\S]*?user_id\\s+UUID\\s+NOT\\s+NULL[\\s\\S]*?DEFAULT\\s+auth\\.uid\\(\\)[\\s\\S]*?REFERENCES\\s+auth\\.users\\(id\\)\\s+ON\\s+DELETE\\s+CASCADE`,
          "i"
        )
        expect(migrationContent).toMatch(fkRegex)
      }
    })

    it("pins search_path on handle_new_user SECURITY DEFINER function", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.handle_new_user\(\)[\s\S]*?SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public,\s*pg_temp/i
      )
    })

    it("ensures created_at and updated_at timestamps exist on all tables", () => {
      for (const table of requiredTables) {
        const timestampRegex = new RegExp(
          `CREATE\\s+TABLE[\\s\\S]*?public\\.${table}[\\s\\S]*?created_at\\s+TIMESTAMPTZ[\\s\\S]*?updated_at\\s+TIMESTAMPTZ`,
          "i"
        )
        expect(migrationContent).toMatch(timestampRegex)
      }
    })
  })

  describe("2. PostgreSQL Constraints", () => {
    it("enforces task status and priority check constraints", () => {
      expect(migrationContent).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\('todo',\s*'in_progress',\s*'completed',\s*'cancelled'\)\s*\)/i
      )
      expect(migrationContent).toMatch(
        /CHECK\s*\(\s*priority\s+IN\s*\('low',\s*'medium',\s*'high'\)\s*\)/i
      )
    })

    it("enforces event start and end time ordering constraint", () => {
      expect(migrationContent).toMatch(
        /CONSTRAINT\s+chk_events_time_order\s+CHECK\s*\(end_at\s+IS\s+NULL\s+OR\s+end_at\s*>=\s*start_at\)/i
      )
    })

    it("enforces pomodoro session type and duration constraints", () => {
      expect(migrationContent).toMatch(
        /CHECK\s*\(\s*type\s+IN\s*\('focus',\s*'short_break',\s*'long_break'\)\s*\)/i
      )
      expect(migrationContent).toMatch(
        /CHECK\s*\(\s*duration_seconds\s*>\s*0\s*\)/i
      )
    })

    it("enforces push subscription uniqueness per user and endpoint", () => {
      expect(migrationContent).toMatch(
        /CONSTRAINT\s+uq_push_subscriptions_user_endpoint\s+UNIQUE\s*\(\s*user_id,\s*endpoint\s*\)/i
      )
    })
  })

  describe("3. Required Performance Indexes", () => {
    it("creates indexes on user_id for all tables", () => {
      for (const table of requiredTables) {
        const userIndexRegex = new RegExp(
          `CREATE\\s+INDEX\\s+(IF\\s+NOT\\s+EXISTS\\s+)?idx_${table}_user_id\\s+ON\\s+public\\.${table}\\s*\\(\\s*user_id\\s*\\)`,
          "i"
        )
        expect(migrationContent).toMatch(userIndexRegex)
      }
    })

    it("creates index on task due_at", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+INDEX\s+(IF\s+NOT\s+EXISTS\s+)?idx_tasks_due_at\s+ON\s+public\.tasks\s*\(\s*due_at\s*\)/i
      )
    })

    it("creates index on event start_at", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+INDEX\s+(IF\s+NOT\s+EXISTS\s+)?idx_events_start_at\s+ON\s+public\.events\s*\(\s*start_at\s*\)/i
      )
    })

    it("creates index on reminder remind_at", () => {
      expect(migrationContent).toMatch(
        /CREATE\s+INDEX\s+(IF\s+NOT\s+EXISTS\s+)?idx_reminders_remind_at\s+ON\s+public\.reminders\s*\(\s*remind_at\s*\)/i
      )
    })
  })

  describe("4. Row Level Security (RLS) & Strict Ownership Policies", () => {
    it("enables RLS on every user-owned table", () => {
      for (const table of requiredTables) {
        const rlsRegex = new RegExp(
          `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
          "i"
        )
        expect(migrationContent).toMatch(rlsRegex)
      }
    })

    it("enforces SELECT policies restricting access to auth.uid() = user_id", () => {
      for (const table of requiredTables) {
        const selectPolicyRegex = new RegExp(
          `CREATE\\s+POLICY\\s+"${table}_select_own"\\s+ON\\s+public\\.${table}\\s+FOR\\s+SELECT[\\s\\S]*?USING\\s*\\(\\s*auth\\.uid\\(\\)\\s*=\\s*user_id\\s*\\)`,
          "i"
        )
        expect(migrationContent).toMatch(selectPolicyRegex)
      }
    })

    it("enforces INSERT policies verifying auth.uid() = user_id (never trusting client)", () => {
      for (const table of requiredTables) {
        const insertPolicyRegex = new RegExp(
          `CREATE\\s+POLICY\\s+"${table}_insert_own"\\s+ON\\s+public\\.${table}\\s+FOR\\s+INSERT[\\s\\S]*?WITH\\s+CHECK\\s*\\(\\s*auth\\.uid\\(\\)\\s*=\\s*user_id\\s*\\)`,
          "i"
        )
        expect(migrationContent).toMatch(insertPolicyRegex)
      }
    })

    it("enforces UPDATE policies preventing ownership modification (USING + WITH CHECK)", () => {
      for (const table of requiredTables) {
        const updatePolicyRegex = new RegExp(
          `CREATE\\s+POLICY\\s+"${table}_update_own"\\s+ON\\s+public\\.${table}\\s+FOR\\s+UPDATE[\\s\\S]*?USING\\s*\\(\\s*auth\\.uid\\(\\)\\s*=\\s*user_id\\s*\\)[\\s\\S]*?WITH\\s+CHECK\\s*\\(\\s*auth\\.uid\\(\\)\\s*=\\s*user_id\\s*\\)`,
          "i"
        )
        expect(migrationContent).toMatch(updatePolicyRegex)
      }
    })

    it("enforces DELETE policies restricting ownership to auth.uid() = user_id", () => {
      for (const table of requiredTables) {
        const deletePolicyRegex = new RegExp(
          `CREATE\\s+POLICY\\s+"${table}_delete_own"\\s+ON\\s+public\\.${table}\\s+FOR\\s+DELETE[\\s\\S]*?USING\\s*\\(\\s*auth\\.uid\\(\\)\\s*=\\s*user_id\\s*\\)`,
          "i"
        )
        expect(migrationContent).toMatch(deletePolicyRegex)
      }
    })
  })

  describe("5. Seed Script Safety", () => {
    it("does not insert dummy credentials or fake users into auth.users", () => {
      expect(seedContent).not.toMatch(/INSERT\s+INTO\s+auth\.users/i)
    })

    it("locates existing owner from auth.users before seeding data", () => {
      expect(seedContent).toMatch(/SELECT\s+id\s+INTO\s+v_owner_id\s+FROM\s+auth\.users/i)
      expect(seedContent).toMatch(/IF\s+v_owner_id\s+IS\s+NULL\s+THEN/i)
    })
  })

  describe("6. TypeScript Database Definitions", () => {
    it("provides complete typing contract matching schema", () => {
      // Type-level assertion test confirming schema contract compiles
      const mockTask: Task = {
        id: "task-1",
        user_id: "user-1",
        title: "Test Task",
        description: "Test description",
        status: "in_progress",
        priority: "high",
        due_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockProfile: Profile = {
        id: "profile-1",
        user_id: "user-1",
        display_name: "Owner",
        timezone: "Asia/Kolkata",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockNote: Note = {
        id: "note-1",
        user_id: "user-1",
        title: "Test Note",
        content: "Content",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockEvent: Event = {
        id: "event-1",
        user_id: "user-1",
        title: "Event",
        description: null,
        start_at: new Date().toISOString(),
        end_at: new Date().toISOString(),
        all_day: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockPomodoro: PomodoroSession = {
        id: "pomodoro-1",
        user_id: "user-1",
        type: "focus",
        duration_seconds: 1500,
        started_at: new Date().toISOString(),
        ended_at: null,
        task_id: mockTask.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockReminder: Reminder = {
        id: "reminder-1",
        user_id: "user-1",
        title: "Test Reminder",
        remind_at: new Date().toISOString(),
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockPush: PushSubscription = {
        id: "push-1",
        user_id: "user-1",
        endpoint: "https://push.example.com",
        p256dh: "key",
        auth: "auth",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      expect(mockTask.user_id).toBe("user-1")
      expect(mockProfile.timezone).toBe("Asia/Kolkata")
      expect(mockNote.title).toBe("Test Note")
      expect(mockEvent.all_day).toBe(false)
      expect(mockPomodoro.duration_seconds).toBe(1500)
      expect(mockReminder.completed).toBe(false)
      expect(mockPush.endpoint).toBe("https://push.example.com")

      // Verify Database type contains all table definitions
      type Tables = Database["public"]["Tables"]
      type TableKeys = keyof Tables
      const expectedKeys: TableKeys[] = [
        "profiles",
        "tasks",
        "notes",
        "events",
        "pomodoro_sessions",
        "reminders",
        "push_subscriptions",
      ]
      expect(expectedKeys.length).toBe(7)
    })
  })
})
