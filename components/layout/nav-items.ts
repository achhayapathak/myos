import {
  Sun,
  CheckSquare,
  FileText,
  Timer,
  Calendar,
  CheckCircle2,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  shortcut: string
  mobilePriority: boolean
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Today",
    href: "/today",
    icon: Sun,
    shortcut: "1",
    mobilePriority: true,
    description: "Daily dashboard and schedule",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    shortcut: "2",
    mobilePriority: true,
    description: "Tasks, priorities, and todos",
  },
  {
    title: "Notes",
    href: "/notes",
    icon: FileText,
    shortcut: "4",
    mobilePriority: true,
    description: "Markdown notes & scratchpad",
  },
  {
    title: "Focus",
    href: "/focus",
    icon: Timer,
    shortcut: "3",
    mobilePriority: true,
    description: "Pomodoro sessions & timer",
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    shortcut: "5",
    mobilePriority: false,
    description: "Calendar views and events",
  },
  {
    title: "Habits",
    href: "/habits",
    icon: CheckCircle2,
    shortcut: "6",
    mobilePriority: false,
    description: "Daily habits, streaks & consistency",
  },
  {
    title: "Reminders",
    href: "/reminders",
    icon: Bell,
    shortcut: "7",
    mobilePriority: false,
    description: "Time-based notifications",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    shortcut: "8",
    mobilePriority: false,
    description: "Preferences & system settings",
  },
]

