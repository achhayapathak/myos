"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Plus, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Reminder } from "@/types/database"
import { enrichReminder } from "@/lib/reminders/utils"
import { resolveTimeZone, DEFAULT_TIMEZONE } from "@/lib/calendar/timezone-utils"
import { ReminderItem } from "@/components/reminders/reminder-item"
import { ReminderDialog } from "@/components/reminders/reminder-dialog"

interface TodayRemindersProps {
  initialReminders: Reminder[]
  timeZone?: string
}

export function TodayReminders({
  initialReminders,
  timeZone = DEFAULT_TIMEZONE,
}: TodayRemindersProps) {
  const safeTz = resolveTimeZone(timeZone)

  const [reminders, setReminders] = React.useState<Reminder[]>(initialReminders)
  const [prevInitial, setPrevInitial] = React.useState(initialReminders)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [reminderToEdit, setReminderToEdit] = React.useState<Reminder | null>(null)

  // Sync state if server revalidation delivers new props
  if (initialReminders !== prevInitial) {
    setPrevInitial(initialReminders)
    setReminders(initialReminders)
  }

  const enrichedReminders = React.useMemo(() => {
    const now = new Date()
    return reminders.map((r) => enrichReminder(r, safeTz, now))
  }, [reminders, safeTz])

  const pendingCount = reminders.filter((r) => !r.completed).length

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

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              Reminders
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={pendingCount > 0 ? "outline" : "secondary"}
              className="text-[11px] font-mono h-5 px-2"
            >
              {pendingCount} active
            </Badge>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setReminderToEdit(null)
                setDialogOpen(true)
              }}
              className="h-5 px-1.5 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground touch-manipulation cursor-pointer"
              aria-label="Add reminder"
            >
              <Plus className="size-3" />
              <span>Add</span>
            </Button>
          </div>
        </div>

        {enrichedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-lg border border-dashed border-border/60 bg-muted/10">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
              <Bell className="size-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              No reminders scheduled
            </p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 max-w-[240px]">
              You&apos;re all caught up. Set reminders for important deadlines and alerts.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReminderToEdit(null)
                setDialogOpen(true)
              }}
              className="mt-3 text-xs font-mono gap-1.5 touch-manipulation cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Reminder</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {enrichedReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                onEdit={(r) => {
                  setReminderToEdit(r)
                  setDialogOpen(true)
                }}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
        <Link
          href="/reminders"
          className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <span>Manage reminders</span>
          <ArrowRight className="size-3" />
        </Link>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Press ⌥6 to jump
        </span>
      </div>

      {dialogOpen && (
        <ReminderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          reminderToEdit={reminderToEdit}
          timeZone={safeTz}
          onSuccess={handleSaved}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
