"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  LayoutDashboard,
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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { setTheme } = useTheme()

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  if (!open) {
    return null
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="MyOS Command Palette"
      description="Quickly navigate or trigger actions in MyOS"
      className="sm:max-w-lg"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/today"))}>
            <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
            <span>Today</span>
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/tasks"))}>
            <CheckSquare className="mr-2 size-4 text-muted-foreground" />
            <span>Tasks</span>
            <CommandShortcut>G K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/notes"))}>
            <FileText className="mr-2 size-4 text-muted-foreground" />
            <span>Notes</span>
            <CommandShortcut>G N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/focus"))}>
            <Timer className="mr-2 size-4 text-muted-foreground" />
            <span>Focus (Pomodoro)</span>
            <CommandShortcut>G F</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
            <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Calendar</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/reminders"))}>
            <Bell className="mr-2 size-4 text-muted-foreground" />
            <span>Reminders</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <SettingsIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions (Placeholder)">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                router.push("/tasks")
              })
            }
          >
            <Plus className="mr-2 size-4 text-muted-foreground" />
            <span>Create new task</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                router.push("/notes")
              })
            }
          >
            <FileText className="mr-2 size-4 text-muted-foreground" />
            <span>Create quick note</span>
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                router.push("/focus")
              })
            }
          >
            <Play className="mr-2 size-4 text-muted-foreground" />
            <span>Start 25m Focus session</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 size-4 text-muted-foreground" />
            <span>Switch to Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 size-4 text-muted-foreground" />
            <span>Switch to Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 size-4 text-muted-foreground" />
            <span>Use System Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
