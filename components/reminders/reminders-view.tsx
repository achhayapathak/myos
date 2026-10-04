"use client"

import * as React from "react"
import {
  Bell,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Reminder } from "@/types/database"
import type { ReminderFilter } from "@/lib/reminders/types"
import {
  enrichReminder,
  filterReminders,
  deriveReminderCounts,
} from "@/lib/reminders/utils"
import { DEFAULT_TIMEZONE, resolveTimeZone } from "@/lib/calendar/timezone-utils"
import { ReminderItem } from "./reminder-item"
import { ReminderDialog } from "./reminder-dialog"

interface RemindersViewProps {
  initialReminders: Reminder[]
  timeZone?: string
}

export function RemindersView({
  initialReminders,
  timeZone = DEFAULT_TIMEZONE,
}: RemindersViewProps) {
  const safeTz = resolveTimeZone(timeZone)

  // State
  const [reminders, setReminders] = React.useState<Reminder[]>(initialReminders)
  const [prevInitial, setPrevInitial] = React.useState(initialReminders)
  const [activeFilter, setActiveFilter] = React.useState<ReminderFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [reminderToEdit, setReminderToEdit] = React.useState<Reminder | null>(null)

  // Sync state if server revalidation delivers new props
  if (initialReminders !== prevInitial) {
    setPrevInitial(initialReminders)
    setReminders(initialReminders)
  }

  // Derive counts & enriched reminders
  const counts = React.useMemo(() => {
    return deriveReminderCounts(reminders, new Date())
  }, [reminders])

  const enrichedReminders = React.useMemo(() => {
    const now = new Date()
    return reminders.map((r) => enrichReminder(r, safeTz, now))
  }, [reminders, safeTz])

  // Filter & Search
  const displayedReminders = React.useMemo(() => {
    const filtered = filterReminders(enrichedReminders, activeFilter, new Date())
    if (!searchQuery.trim()) {
      return filtered
    }
    const q = searchQuery.toLowerCase()
    return filtered.filter((r) => r.title.toLowerCase().includes(q))
  }, [enrichedReminders, activeFilter, searchQuery])

  // Optimistic Handlers
  const handleToggleComplete = (id: string, completed: boolean) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed } : r))
    )
  }

  const handleDelete = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSaved = (savedReminder: Reminder) => {
    setReminders((prev) => {
      const idx = prev.findIndex((r) => r.id === savedReminder.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = savedReminder
        return copy
      }
      return [savedReminder, ...prev]
    })
  }

  const openNewReminder = () => {
    setReminderToEdit(null)
    setDialogOpen(true)
  }

  const openEditReminder = (reminder: Reminder) => {
    setReminderToEdit(reminder)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <Bell className="size-3.5" />
            <span>Time-based Alerts</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Reminders
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] gap-1 px-2 py-0.5">
              <Globe className="size-3 text-muted-foreground" />
              <span>{safeTz}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {counts.upcoming} upcoming · {counts.pastDue} past due · {counts.completed} completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openNewReminder}
            className="gap-1.5 font-mono text-xs shadow-2xs min-h-[36px] touch-manipulation"
          >
            <Plus className="size-3.5" />
            <span>New Reminder</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
            activeFilter === "all"
              ? "border-primary/50 bg-primary/5 shadow-2xs"
              : "border-border/60 bg-card hover:bg-muted/20"
          }`}
        >
          <span className="text-[11px] font-mono text-muted-foreground">All Reminders</span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {counts.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("upcoming")}
          className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
            activeFilter === "upcoming"
              ? "border-primary/50 bg-primary/5 shadow-2xs"
              : "border-border/60 bg-card hover:bg-muted/20"
          }`}
        >
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <Clock className="size-3 text-blue-500" />
            <span>Upcoming</span>
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {counts.upcoming}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("past_due")}
          className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
            counts.pastDue > 0
              ? activeFilter === "past_due"
                ? "border-destructive bg-destructive/10 shadow-2xs"
                : "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
              : activeFilter === "past_due"
              ? "border-primary/50 bg-primary/5 shadow-2xs"
              : "border-border/60 bg-card hover:bg-muted/20"
          }`}
        >
          <span
            className={`text-[11px] font-mono flex items-center gap-1 ${
              counts.pastDue > 0 ? "text-destructive font-semibold" : "text-muted-foreground"
            }`}
          >
            <AlertCircle className="size-3" />
            <span>Past Due</span>
          </span>
          <span
            className={`text-xl font-bold tracking-tight mt-0.5 ${
              counts.pastDue > 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {counts.pastDue}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("completed")}
          className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
            activeFilter === "completed"
              ? "border-primary/50 bg-primary/5 shadow-2xs"
              : "border-border/60 bg-card hover:bg-muted/20"
          }`}
        >
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>Completed</span>
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Web Push Architecture Info Banner */}
      {/* <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground shrink-0">
            <Smartphone className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Web Push Delivery Abstraction</span>
              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 uppercase">
                Decoupled
              </Badge>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Deliveries queue in database independently of browser notification permissions.
            </span>
          </div>
        </div>

        <Badge variant="secondary" className="font-mono text-[10px] w-fit shrink-0">
          Independent Core
        </Badge>
      </div> */}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-mono overflow-x-auto touch-pan-x">
          {(["all", "upcoming", "past_due", "completed"] as ReminderFilter[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-2 sm:py-1.5 rounded-md font-semibold capitalize whitespace-nowrap transition-all touch-manipulation ${
                activeFilter === tab
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "past_due" ? "Past Due" : tab}
              <span className="ml-1.5 text-[10px] opacity-70">
                (
                {tab === "all"
                  ? counts.total
                  : tab === "upcoming"
                  ? counts.upcoming
                  : tab === "past_due"
                  ? counts.pastDue
                  : counts.completed}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-base sm:text-xs font-mono h-9"
          />
        </div>
      </div>

      {/* Reminders List */}
      <div className="flex flex-col gap-2.5">
        {displayedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/50">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
              <Bell className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {activeFilter === "past_due"
                ? "No past-due reminders!"
                : activeFilter === "upcoming"
                ? "No upcoming reminders"
                : activeFilter === "completed"
                ? "No completed reminders"
                : "No reminders found"}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1 max-w-xs">
              {activeFilter === "past_due"
                ? "All your scheduled reminders are on track."
                : searchQuery
                ? "No reminders matched your search query."
                : "Create a reminder to keep track of tasks, deadlines, and alerts."}
            </p>
            {activeFilter !== "past_due" && !searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={openNewReminder}
                className="mt-4 gap-1.5 font-mono text-xs"
              >
                <Plus className="size-3.5" />
                <span>Create Reminder</span>
              </Button>
            )}
          </div>
        ) : (
          displayedReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onEdit={openEditReminder}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Reminder Create/Edit Dialog */}
      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reminderToEdit={reminderToEdit}
        timeZone={safeTz}
        onSuccess={handleSaved}
        onDelete={handleDelete}
      />
    </div>
  )
}
