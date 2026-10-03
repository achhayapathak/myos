import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"

describe("Global Command Palette Specification Tests", () => {
  const rootDir = process.cwd()
  const commandPalettePath = path.join(rootDir, "components/command-palette.tsx")

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("1. Architectural & File Integrity", () => {
    it("ensures components/command-palette.tsx exists and is a client component", () => {
      expect(fs.existsSync(commandPalettePath)).toBe(true)

      const content = fs.readFileSync(commandPalettePath, "utf-8")
      expect(content).toMatch(/^["']use client["']/)
      expect(content).toContain("export function CommandPaletteProvider")
      expect(content).toContain("export function useCommandPalette")
      expect(content).toContain("export function CommandPalette")
    })

    it("verifies cmdk library is used for lightweight, keyboard-first command search", () => {
      const packageJsonPath = path.join(rootDir, "package.json")
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

      expect(packageJson.dependencies["cmdk"]).toBeDefined()
    })
  })

  describe("2. Required Commands Verification", () => {
    it("contains all exact navigation and action commands required by specification", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      const requiredCommands = [
        "Go to Today",
        "Go to Tasks",
        "Go to Notes",
        "Go to Focus",
        "Go to Calendar",
        "Go to Reminders",
        "Create Task",
        "Create Note",
        "Start Focus",
      ]

      for (const cmd of requiredCommands) {
        expect(content).toContain(cmd)
      }
    })

    it("includes rich search keyword values for keyboard-first matching", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      // Search values must include relevant synonyms
      expect(content).toContain("value=\"Go to Today today dashboard home agenda overview daily\"")
      expect(content).toContain("value=\"Go to Tasks tasks todo list backlog items actions\"")
      expect(content).toContain("value=\"Go to Notes notes memo markdown scratchpad write docs\"")
      expect(content).toContain("value=\"Go to Focus focus pomodoro timer clock work session\"")
      expect(content).toContain("value=\"Go to Calendar calendar schedule events timeline month week day\"")
      expect(content).toContain("value=\"Go to Reminders reminders alerts notifications scheduled\"")
      expect(content).toContain("value=\"Create Task new task add todo new item action create\"")
      expect(content).toContain("value=\"Create Note new note memo write scratchpad markdown create\"")
      expect(content).toContain("value=\"Start Focus start pomodoro timer 25m work interval session begin\"")
    })
  })

  describe("3. Keyboard Shortcut & Global Event Handling", () => {
    it("handles Cmd/Ctrl + K shortcut to toggle open state and prevents default browser behavior", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      // Checks for metaKey or ctrlKey with k or K
      expect(content).toMatch(/\(e\.metaKey\s*\|\|\s*e\.ctrlKey\)\s*&&\s*\(e\.key\s*===\s*["']k["']\s*\|\|\s*e\.key\s*===\s*["']K["']\)/)
      expect(content).toContain("e.preventDefault()")
      expect(content).toContain("setOpen((prev) => !prev)")
    })

    it("simulates Cmd+K keyboard shortcut toggle logic", () => {
      let isOpen = false
      const toggle = () => {
        isOpen = !isOpen
      }

      const handler = (e: { metaKey: boolean; ctrlKey: boolean; key: string; preventDefault: () => void }) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
          e.preventDefault()
          toggle()
        }
      }

      const preventDefaultMock = vi.fn()

      // Mac Cmd+K
      handler({ metaKey: true, ctrlKey: false, key: "k", preventDefault: preventDefaultMock })
      expect(preventDefaultMock).toHaveBeenCalled()
      expect(isOpen).toBe(true)

      // Toggle again
      handler({ metaKey: true, ctrlKey: false, key: "K", preventDefault: preventDefaultMock })
      expect(isOpen).toBe(false)

      // Windows/Linux Ctrl+K
      handler({ metaKey: false, ctrlKey: true, key: "k", preventDefault: preventDefaultMock })
      expect(isOpen).toBe(true)
    })
  })

  describe("4. Desktop & Mobile Usability and Accessibility", () => {
    it("ensures DesktopSidebar includes search/jump trigger", () => {
      const sidebarPath = path.join(rootDir, "components/layout/sidebar.tsx")
      const content = fs.readFileSync(sidebarPath, "utf-8")

      expect(content).toContain("useCommandPalette")
      expect(content).toContain("Search / Jump")
      expect(content).toContain("⌘K")
    })

    it("ensures Topbar includes accessible search trigger for mobile and desktop", () => {
      const topbarPath = path.join(rootDir, "components/layout/topbar.tsx")
      const content = fs.readFileSync(topbarPath, "utf-8")

      expect(content).toContain("useCommandPalette")
      expect(content).toContain("setOpen(true)")
      expect(content).toContain("Search")
    })

    it("ensures MobileBottomNav includes Command Palette option for mobile users", () => {
      const bottomNavPath = path.join(rootDir, "components/layout/bottom-nav.tsx")
      const content = fs.readFileSync(bottomNavPath, "utf-8")

      expect(content).toContain("useCommandPalette")
      expect(content).toContain("setCommandPaletteOpen(true)")
      expect(content).toContain("Command Palette")
    })

    it("configures responsive dialog sizing and close button for mobile accessibility", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      expect(content).toContain("w-[calc(100vw-2rem)]")
      expect(content).toContain("showCloseButton={true}")
      expect(content).toContain("autoFocus")
    })
  })

  describe("5. Action Execution & Route Integration", () => {
    it("wires Create Task to dispatch myos:create-task on /tasks or navigate with ?new=true", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      expect(content).toContain("myos:create-task")
      expect(content).toContain("router.push(\"/tasks?new=true\")")

      const tasksViewPath = path.join(rootDir, "components/tasks/tasks-view.tsx")
      const tasksContent = fs.readFileSync(tasksViewPath, "utf-8")
      expect(tasksContent).toContain("myos:create-task")
      expect(tasksContent).toContain("setIsCreateOpen(true)")
    })

    it("wires Create Note to dispatch myos:create-note on /notes or navigate with ?new=true", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      expect(content).toContain("myos:create-note")
      expect(content).toContain("router.push(\"/notes?new=true\")")

      const notesViewPath = path.join(rootDir, "components/notes/notes-view.tsx")
      const notesContent = fs.readFileSync(notesViewPath, "utf-8")
      expect(notesContent).toContain("myos:create-note")
      expect(notesContent).toContain("handleCreateNote()")
    })

    it("wires Start Focus to dispatch myos:start-focus on /focus or navigate with ?start=true", () => {
      const content = fs.readFileSync(commandPalettePath, "utf-8")

      expect(content).toContain("myos:start-focus")
      expect(content).toContain("router.push(\"/focus?start=true\")")

      const focusViewPath = path.join(rootDir, "components/focus/focus-view.tsx")
      const focusContent = fs.readFileSync(focusViewPath, "utf-8")
      expect(focusContent).toContain("myos:start-focus")
      expect(focusContent).toContain("handleStartSession(\"focus\")")
    })
  })
})
