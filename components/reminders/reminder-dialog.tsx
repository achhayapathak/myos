"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Reminder } from "@/types/database"
import {
  createReminder,
  updateReminder,
  deleteReminder,
} from "@/app/(app)/reminders/actions"
import {
  utcToLocalDateParts,
  DEFAULT_TIMEZONE,
  resolveTimeZone,
} from "@/lib/calendar/timezone-utils"
import {
  AlertCircle,
  Bell,
  Clock,
  Loader2,
  Trash2,
  Globe,
  Sparkles,
} from "lucide-react"

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reminderToEdit?: Reminder | null
  timeZone?: string
  onSuccess?: (savedReminder: Reminder) => void
  onDelete?: (deletedId: string) => void
}

interface InnerFormProps {
  reminderToEdit?: Reminder | null
  timeZone: string
  onOpenChange: (open: boolean) => void
  onSuccess?: (savedReminder: Reminder) => void
  onDelete?: (deletedId: string) => void
}

function computePresetDate(hoursAhead: number, targetHour?: number, targetMinute = 0): {
  date: string
  time: string
} {
  const d = new Date()
  if (targetHour !== undefined) {
    // If target hour is earlier today, move to tomorrow
    d.setDate(d.getDate() + (hoursAhead > 0 ? 1 : 0))
    d.setHours(targetHour, targetMinute, 0, 0)
  } else {
    d.setHours(d.getHours() + hoursAhead)
  }

  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function ReminderDialogInner({
  reminderToEdit,
  timeZone,
  onOpenChange,
  onSuccess,
  onDelete,
}: InnerFormProps) {
  const safeTz = resolveTimeZone(timeZone)
  const isEditing = Boolean(reminderToEdit)

  // Initialize values
  const initialValues = React.useMemo(() => {
    if (reminderToEdit) {
      const parts = utcToLocalDateParts(reminderToEdit.remind_at, safeTz)
      return {
        title: reminderToEdit.title,
        scheduledDate: parts.date,
        scheduledTime: parts.time,
      }
    }

    // Default to +2 hours ahead rounded to next 30 min
    const nowParts = utcToLocalDateParts(new Date().toISOString(), safeTz)
    const hour = (nowParts.hour + 2) % 24
    const pad = (n: number) => String(n).padStart(2, "0")
    return {
      title: "",
      scheduledDate: nowParts.date,
      scheduledTime: `${pad(hour)}:00`,
    }
  }, [reminderToEdit, safeTz])

  const [title, setTitle] = React.useState(initialValues.title)
  const [scheduledDate, setScheduledDate] = React.useState(initialValues.scheduledDate)
  const [scheduledTime, setScheduledTime] = React.useState(initialValues.scheduledTime)

  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const applyPreset = (preset: { date: string; time: string }) => {
    setScheduledDate(preset.date)
    setScheduledTime(preset.time)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please provide a reminder title.")
      return
    }

    if (!scheduledDate || !scheduledTime) {
      setError("Please specify both date and time.")
      return
    }

    setLoading(true)

    try {
      const payload = {
        id: reminderToEdit?.id,
        title: title.trim(),
        scheduledDate,
        scheduledTime,
        timeZone: safeTz,
      }

      const res = isEditing && reminderToEdit
        ? await updateReminder(reminderToEdit.id, payload)
        : await createReminder(payload)

      if (!res.success || !res.data) {
        setError(res.error || "Failed to save reminder.")
        setLoading(false)
        return
      }

      onSuccess?.(res.data)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reminderToEdit) return
    setError(null)
    setDeleting(true)

    try {
      const res = await deleteReminder(reminderToEdit.id)
      if (!res.success) {
        setError(res.error || "Failed to delete reminder.")
        setDeleting(false)
        return
      }

      onDelete?.(reminderToEdit.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reminder.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            {isEditing ? "Edit Reminder" : "Create Reminder"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3 text-muted-foreground/70" />
            <span>Scheduled in user timezone:</span>
            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
              {safeTz}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reminder-title" className="text-xs font-semibold text-foreground">
            Reminder Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="reminder-title"
            placeholder="e.g. Call accountant, Deploy hotfix, Take vitamins"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading || deleting}
            autoFocus
            className="text-base sm:text-sm font-medium"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            <span>Quick Presets</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(computePresetDate(1))}
              disabled={loading || deleting}
              className="min-h-[30px] touch-manipulation text-[11px] font-mono"
            >
              +1 Hour
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(computePresetDate(3))}
              disabled={loading || deleting}
              className="min-h-[30px] touch-manipulation text-[11px] font-mono"
            >
              +3 Hours
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(computePresetDate(1, 9, 0))}
              disabled={loading || deleting}
              className="min-h-[30px] touch-manipulation text-[11px] font-mono"
            >
              Tomorrow 9 AM
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(computePresetDate(1, 18, 0))}
              disabled={loading || deleting}
              className="min-h-[30px] touch-manipulation text-[11px] font-mono"
            >
              Tomorrow 6 PM
            </Button>
          </div>
        </div>

        {/* Date and Time Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reminder-date" className="text-xs font-medium text-foreground">
              Scheduled Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              id="reminder-date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={loading || deleting}
              className="font-mono text-base sm:text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reminder-time" className="text-xs font-medium text-foreground">
              Scheduled Time <span className="text-destructive">*</span>
            </label>
            <Input
              type="time"
              id="reminder-time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              disabled={loading || deleting}
              className="font-mono text-base sm:text-xs"
            />
          </div>
        </div>

        {/* Delivery Note */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 flex items-start gap-2">
          <Clock className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Reminders are stored in UTC and work independently of browser notification settings.
          </p>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/50">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-1.5 text-xs font-mono touch-manipulation"
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Delete</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
              className="text-xs font-mono touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || deleting || !title.trim()}
              className="gap-1.5 text-xs font-mono touch-manipulation"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Set Reminder"}</span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function ReminderDialog({
  open,
  onOpenChange,
  reminderToEdit,
  timeZone = DEFAULT_TIMEZONE,
  onSuccess,
  onDelete,
}: ReminderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ReminderDialogInner
          key={reminderToEdit?.id ?? "new-reminder"}
          reminderToEdit={reminderToEdit}
          timeZone={timeZone}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          onDelete={onDelete}
        />
      )}
    </Dialog>
  )
}
