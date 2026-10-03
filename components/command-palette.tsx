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

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

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

  if (!open) {
    return null
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="MyOS Command Palette"
      description="Quickly navigate or trigger actions in MyOS"
      showCloseButton={true}
      className="w-[calc(100vw-2rem)] sm:max-w-lg"
    >
      <CommandInput
        placeholder="Type a command or search..."
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No matching commands found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            value="Create Task new task add todo new item action create"
            onSelect={handleCreateTask}
          >
            <Plus className="mr-2 size-4 text-primary" />
            <span className="font-medium">Create Task</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Create Note new note memo write scratchpad markdown create"
            onSelect={handleCreateNote}
          >
            <FileText className="mr-2 size-4 text-emerald-500" />
            <span className="font-medium">Create Note</span>
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Start Focus start pomodoro timer 25m work interval session begin"
            onSelect={handleStartFocus}
          >
            <Play className="mr-2 size-4 text-red-500" />
            <span className="font-medium">Start Focus</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            value="Go to Today today dashboard home agenda overview daily"
            onSelect={() => runCommand(() => router.push("/today"))}
          >
            <Sun className="mr-2 size-4 text-amber-500" />
            <span>Go to Today</span>
            <CommandShortcut>⌥1</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Tasks tasks todo list backlog items actions"
            onSelect={() => runCommand(() => router.push("/tasks"))}
          >
            <CheckSquare className="mr-2 size-4 text-blue-500" />
            <span>Go to Tasks</span>
            <CommandShortcut>⌥2</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Notes notes memo markdown scratchpad write docs"
            onSelect={() => runCommand(() => router.push("/notes"))}
          >
            <FileText className="mr-2 size-4 text-emerald-500" />
            <span>Go to Notes</span>
            <CommandShortcut>⌥4</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Focus focus pomodoro timer clock work session"
            onSelect={() => runCommand(() => router.push("/focus"))}
          >
            <Timer className="mr-2 size-4 text-red-500" />
            <span>Go to Focus</span>
            <CommandShortcut>⌥3</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Calendar calendar schedule events timeline month week day"
            onSelect={() => runCommand(() => router.push("/calendar"))}
          >
            <CalendarIcon className="mr-2 size-4 text-purple-500" />
            <span>Go to Calendar</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Reminders reminders alerts notifications scheduled"
            onSelect={() => runCommand(() => router.push("/reminders"))}
          >
            <Bell className="mr-2 size-4 text-pink-500" />
            <span>Go to Reminders</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Go to Settings system preferences configuration account"
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <SettingsIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Go to Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem
            value="Switch to Light Theme theme appearance color light"
            onSelect={() => runCommand(() => setTheme("light"))}
          >
            <Sun className="mr-2 size-4 text-muted-foreground" />
            <span>Switch to Light Theme</span>
          </CommandItem>
          <CommandItem
            value="Switch to Dark Theme theme appearance color dark"
            onSelect={() => runCommand(() => setTheme("dark"))}
          >
            <Moon className="mr-2 size-4 text-muted-foreground" />
            <span>Switch to Dark Theme</span>
          </CommandItem>
          <CommandItem
            value="Use System Theme theme appearance color auto system"
            onSelect={() => runCommand(() => setTheme("system"))}
          >
            <Monitor className="mr-2 size-4 text-muted-foreground" />
            <span>Use System Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

