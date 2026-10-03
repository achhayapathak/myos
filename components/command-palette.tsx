"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Sun,
  Moon,
  Monitor,
  CheckSquare,
  FileText,
  Timer,
  Calendar as CalendarIcon,
  Bell,
  Settings as SettingsIcon,
  Plus,
  Play,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import { globalSearchAction } from "@/lib/search/actions"
import {
  getTaskMetadata,
  getNoteMetadata,
  getEventMetadata,
} from "@/lib/search/utils"
import type {
  SearchTaskResult,
  SearchNoteResult,
  SearchEventResult,
  GlobalSearchResults,
} from "@/lib/search/types"

interface CommandPaletteContextType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggle: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextType | null>(null)

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider")
  }
  return context
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const toggle = React.useCallback(() => setOpen((prev) => !prev), [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme } = useTheme()

  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<GlobalSearchResults>({
    tasks: [],
    notes: [],
    events: [],
  })

  const handleQueryChange = React.useCallback((val: string) => {
    setQuery(val)
    if (!val.trim()) {
      setSearchResults({ tasks: [], notes: [], events: [] })
      setIsSearching(false)
    }
  }, [])

  // Debounced PostgreSQL search
  React.useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await globalSearchAction(trimmed)
        if (res.success && res.data) {
          setSearchResults(res.data)
        }
      } catch {
        // Handled silently to preserve existing state
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Reset state when palette is closed
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery("")
        setIsSearching(false)
        setSearchResults({ tasks: [], notes: [], events: [] })
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  const runCommand = React.useCallback(
    (command: () => void) => {
      handleOpenChange(false)
      command()
    },
    [handleOpenChange]
  )

  // Direct action command dispatchers
  const handleCreateTask = React.useCallback(() => {
    runCommand(() => {
      if (pathname === "/tasks") {
        window.dispatchEvent(new CustomEvent("myos:create-task"))
      } else {
        router.push("/tasks?new=true")
      }
    })
  }, [pathname, router, runCommand])

  const handleCreateNote = React.useCallback(() => {
    runCommand(() => {
      if (pathname === "/notes") {
        window.dispatchEvent(new CustomEvent("myos:create-note"))
      } else {
        router.push("/notes?new=true")
      }
    })
  }, [pathname, router, runCommand])

  const handleStartFocus = React.useCallback(() => {
    runCommand(() => {
      if (pathname === "/focus") {
        window.dispatchEvent(new CustomEvent("myos:start-focus"))
      } else {
        router.push("/focus?start=true")
      }
    })
  }, [pathname, router, runCommand])

  // Direct item selection handlers
  const handleSelectTask = React.useCallback(
    (task: SearchTaskResult) => {
      runCommand(() => {
        if (pathname === "/tasks") {
          window.dispatchEvent(
            new CustomEvent("myos:select-task", { detail: { taskId: task.id } })
          )
        } else {
          router.push(`/tasks?taskId=${encodeURIComponent(task.id)}`)
        }
      })
    },
    [pathname, router, runCommand]
  )

  const handleSelectNote = React.useCallback(
    (note: SearchNoteResult) => {
      runCommand(() => {
        if (pathname === "/notes") {
          window.dispatchEvent(
            new CustomEvent("myos:select-note", { detail: { noteId: note.id } })
          )
        } else {
          router.push(`/notes?noteId=${encodeURIComponent(note.id)}`)
        }
      })
    },
    [pathname, router, runCommand]
  )

  const handleSelectEvent = React.useCallback(
    (event: SearchEventResult) => {
      runCommand(() => {
        if (pathname === "/calendar") {
          window.dispatchEvent(
            new CustomEvent("myos:select-event", { detail: { eventId: event.id } })
          )
        } else {
          router.push(`/calendar?eventId=${encodeURIComponent(event.id)}`)
        }
      })
    },
    [pathname, router, runCommand]
  )

  if (!open) {
    return null
  }

  const q = query.trim().toLowerCase()
  const match = (text: string) => {
    if (!q) return true
    return text.toLowerCase().includes(q)
  }

  // Pre-calculate matching static commands
  const showCreateTask = match("Create Task new task add todo new item action create")
  const showCreateNote = match("Create Note new note memo write scratchpad markdown create")
  const showStartFocus = match("Start Focus start pomodoro timer 25m work interval session begin")

  const showGoToday = match("Go to Today today dashboard home agenda overview daily")
  const showGoTasks = match("Go to Tasks tasks todo list backlog items actions")
  const showGoNotes = match("Go to Notes notes memo markdown scratchpad write docs")
  const showGoFocus = match("Go to Focus focus pomodoro timer clock work session")
  const showGoCalendar = match("Go to Calendar calendar schedule events timeline month week day")
  const showGoReminders = match("Go to Reminders reminders alerts notifications scheduled")
  const showGoSettings = match("Go to Settings system preferences configuration account")

  const showThemeLight = match("Switch to Light Theme theme appearance color light")
  const showThemeDark = match("Switch to Dark Theme theme appearance color dark")
  const showThemeSystem = match("Use System Theme theme appearance color auto system")

  const hasTasks = searchResults.tasks.length > 0
  const hasNotes = searchResults.notes.length > 0
  const hasEvents = searchResults.events.length > 0

  const hasActions = showCreateTask || showCreateNote || showStartFocus
  const hasNav =
    showGoToday ||
    showGoTasks ||
    showGoNotes ||
    showGoFocus ||
    showGoCalendar ||
    showGoReminders ||
    showGoSettings
  const hasAppearance = showThemeLight || showThemeDark || showThemeSystem

  const hasAnyResults = hasTasks || hasNotes || hasEvents || hasActions || hasNav || hasAppearance

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="MyOS Command Palette & Global Search"
      description="Quickly search tasks, notes, calendar events, or run commands"
      showCloseButton={true}
      shouldFilter={false}
      className="w-[calc(100vw-2rem)] sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search tasks, notes, calendar, or type a command..."
        autoFocus
        value={query}
        onValueChange={handleQueryChange}
        isLoading={isSearching}
      />
      <CommandList>
        <CommandEmpty>No matching commands found.</CommandEmpty>

        {/* Dynamic Search Results: Tasks */}
        {hasTasks && (
          <CommandGroup heading={`Tasks (${searchResults.tasks.length})`}>
            {searchResults.tasks.map((task) => {
              const meta = getTaskMetadata(task)
              return (
                <CommandItem
                  key={task.id}
                  value={`task-${task.id}-${task.title}`}
                  onSelect={() => handleSelectTask(task)}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 min-h-[44px] cursor-pointer touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <CheckSquare className="size-4 shrink-0 text-blue-500" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate text-foreground text-sm">
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 uppercase font-semibold shrink-0",
                            task.priority === "high"
                              ? "border-red-500/40 text-red-500 bg-red-500/10"
                              : task.priority === "medium"
                              ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                              : "border-slate-500/40 text-muted-foreground"
                          )}
                        >
                          {meta.priorityLabel}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground capitalize shrink-0">
                          {meta.statusLabel}
                        </span>
                      </div>
                      {meta.descriptionSnippet && (
                        <span className="text-xs text-muted-foreground truncate">
                          {meta.descriptionSnippet}
                        </span>
                      )}
                    </div>
                  </div>
                  {meta.dueLabel && (
                    <span
                      className={cn(
                        "text-[11px] shrink-0 font-medium",
                        meta.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {meta.dueLabel}
                    </span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Dynamic Search Results: Notes */}
        {hasNotes && (
          <CommandGroup heading={`Notes (${searchResults.notes.length})`}>
            {searchResults.notes.map((note) => {
              const meta = getNoteMetadata(note)
              return (
                <CommandItem
                  key={note.id}
                  value={`note-${note.id}-${note.title}`}
                  onSelect={() => handleSelectNote(note)}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 min-h-[44px] cursor-pointer touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <FileText className="size-4 shrink-0 text-emerald-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate text-foreground text-sm">
                        {note.title}
                      </span>
                      {meta.contentSnippet && (
                        <span className="text-xs text-muted-foreground truncate">
                          {meta.contentSnippet}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {meta.updatedLabel}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Dynamic Search Results: Calendar Events */}
        {hasEvents && (
          <CommandGroup heading={`Calendar Events (${searchResults.events.length})`}>
            {searchResults.events.map((event) => {
              const meta = getEventMetadata(event)
              return (
                <CommandItem
                  key={event.id}
                  value={`event-${event.id}-${event.title}`}
                  onSelect={() => handleSelectEvent(event)}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 min-h-[44px] cursor-pointer touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <CalendarIcon className="size-4 shrink-0 text-purple-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate text-foreground text-sm">
                        {event.title}
                      </span>
                      {meta.descriptionSnippet && (
                        <span className="text-xs text-muted-foreground truncate">
                          {meta.descriptionSnippet}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {meta.timeLabel}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Separator between search results and commands if both are present */}
        {(hasTasks || hasNotes || hasEvents) && (hasActions || hasNav || hasAppearance) && (
          <CommandSeparator />
        )}

        {/* Standard Actions */}
        {hasActions && (
          <CommandGroup heading="Actions">
            {showCreateTask && (
              <CommandItem
                value="Create Task new task add todo new item action create"
                onSelect={handleCreateTask}
              >
                <Plus className="mr-2 size-4 text-primary" />
                <span className="font-medium">Create Task</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
            )}

            {showCreateNote && (
              <CommandItem
                value="Create Note new note memo write scratchpad markdown create"
                onSelect={handleCreateNote}
              >
                <FileText className="mr-2 size-4 text-emerald-500" />
                <span className="font-medium">Create Note</span>
                <CommandShortcut>⌘J</CommandShortcut>
              </CommandItem>
            )}

            {showStartFocus && (
              <CommandItem
                value="Start Focus start pomodoro timer 25m work interval session begin"
                onSelect={handleStartFocus}
              >
                <Play className="mr-2 size-4 text-red-500" />
                <span className="font-medium">Start Focus</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {hasNav && <CommandSeparator />}

        {/* Navigation */}
        {hasNav && (
          <CommandGroup heading="Navigation">
            {showGoToday && (
              <CommandItem
                value="Go to Today today dashboard home agenda overview daily"
                onSelect={() => runCommand(() => router.push("/today"))}
              >
                <Sun className="mr-2 size-4 text-amber-500" />
                <span>Go to Today</span>
                <CommandShortcut>⌥1</CommandShortcut>
              </CommandItem>
            )}

            {showGoTasks && (
              <CommandItem
                value="Go to Tasks tasks todo list backlog items actions"
                onSelect={() => runCommand(() => router.push("/tasks"))}
              >
                <CheckSquare className="mr-2 size-4 text-blue-500" />
                <span>Go to Tasks</span>
                <CommandShortcut>⌥2</CommandShortcut>
              </CommandItem>
            )}

            {showGoNotes && (
              <CommandItem
                value="Go to Notes notes memo markdown scratchpad write docs"
                onSelect={() => runCommand(() => router.push("/notes"))}
              >
                <FileText className="mr-2 size-4 text-emerald-500" />
                <span>Go to Notes</span>
                <CommandShortcut>⌥4</CommandShortcut>
              </CommandItem>
            )}

            {showGoFocus && (
              <CommandItem
                value="Go to Focus focus pomodoro timer clock work session"
                onSelect={() => runCommand(() => router.push("/focus"))}
              >
                <Timer className="mr-2 size-4 text-red-500" />
                <span>Go to Focus</span>
                <CommandShortcut>⌥3</CommandShortcut>
              </CommandItem>
            )}

            {showGoCalendar && (
              <CommandItem
                value="Go to Calendar calendar schedule events timeline month week day"
                onSelect={() => runCommand(() => router.push("/calendar"))}
              >
                <CalendarIcon className="mr-2 size-4 text-purple-500" />
                <span>Go to Calendar</span>
                <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
            )}

            {showGoReminders && (
              <CommandItem
                value="Go to Reminders reminders alerts notifications scheduled"
                onSelect={() => runCommand(() => router.push("/reminders"))}
              >
                <Bell className="mr-2 size-4 text-pink-500" />
                <span>Go to Reminders</span>
                <CommandShortcut>G R</CommandShortcut>
              </CommandItem>
            )}

            {showGoSettings && (
              <CommandItem
                value="Go to Settings system preferences configuration account"
                onSelect={() => runCommand(() => router.push("/settings"))}
              >
                <SettingsIcon className="mr-2 size-4 text-muted-foreground" />
                <span>Go to Settings</span>
                <CommandShortcut>G S</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {hasAppearance && <CommandSeparator />}

        {/* Appearance */}
        {hasAppearance && (
          <CommandGroup heading="Appearance">
            {showThemeLight && (
              <CommandItem
                value="Switch to Light Theme theme appearance color light"
                onSelect={() => runCommand(() => setTheme("light"))}
              >
                <Sun className="mr-2 size-4 text-muted-foreground" />
                <span>Switch to Light Theme</span>
              </CommandItem>
            )}
            {showThemeDark && (
              <CommandItem
                value="Switch to Dark Theme theme appearance color dark"
                onSelect={() => runCommand(() => setTheme("dark"))}
              >
                <Moon className="mr-2 size-4 text-muted-foreground" />
                <span>Switch to Dark Theme</span>
              </CommandItem>
            )}
            {showThemeSystem && (
              <CommandItem
                value="Use System Theme theme appearance color auto system"
                onSelect={() => runCommand(() => setTheme("system"))}
              >
                <Monitor className="mr-2 size-4 text-muted-foreground" />
                <span>Use System Theme</span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {/* Loading state indicator */}
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground border-t border-border/40 mt-1">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Searching PostgreSQL database...</span>
          </div>
        )}

        {/* Empty state when no matches */}
        {!hasAnyResults && !isSearching && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {q ? `No results found for "${query.trim()}".` : "No matching commands found."}
          </div>
        )}
      </CommandList>
    </CommandDialog>
  )
}
