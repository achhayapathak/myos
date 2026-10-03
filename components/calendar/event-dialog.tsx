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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { Event as DbEvent } from "@/types/database"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/app/(app)/calendar/actions"
import {
  utcToLocalDateParts,
  DEFAULT_TIMEZONE,
  resolveTimeZone,
} from "@/lib/calendar/timezone-utils"
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Trash2,
  Globe,
} from "lucide-react"

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventToEdit?: DbEvent | null
  prefilledDate?: string | null
  prefilledTime?: string | null
  prefilledAllDay?: boolean
  timeZone?: string
  onSuccess?: (savedEvent: DbEvent) => void
  onDelete?: (deletedId: string) => void
}

function computeDefaultEndTime(timeStr: string): string {
  const [hourStr, minStr] = timeStr.split(":")
  const hour = (parseInt(hourStr || "9", 10) + 1) % 24
  return `${String(hour).padStart(2, "0")}:${minStr || "00"}`
}

interface InnerFormProps {
  eventToEdit?: DbEvent | null
  prefilledDate?: string | null
  prefilledTime?: string | null
  prefilledAllDay?: boolean
  timeZone: string
  onOpenChange: (open: boolean) => void
  onSuccess?: (savedEvent: DbEvent) => void
  onDelete?: (deletedId: string) => void
}

function EventDialogContentInner({
  eventToEdit,
  prefilledDate,
  prefilledTime,
  prefilledAllDay = false,
  timeZone,
  onOpenChange,
  onSuccess,
  onDelete,
}: InnerFormProps) {
  const safeTz = resolveTimeZone(timeZone)
  const isEditing = Boolean(eventToEdit)

  // Compute initial values directly without useEffect
  const initialValues = React.useMemo(() => {
    if (eventToEdit) {
      const startParts = utcToLocalDateParts(eventToEdit.start_at, safeTz)
      let endDateVal = startParts.date
      let endTimeVal = computeDefaultEndTime(startParts.time)

      if (eventToEdit.end_at) {
        const endParts = utcToLocalDateParts(eventToEdit.end_at, safeTz)
        endDateVal = endParts.date
        endTimeVal = endParts.time
      }

      return {
        title: eventToEdit.title,
        description: eventToEdit.description || "",
        allDay: eventToEdit.all_day,
        startDate: startParts.date,
        startTime: startParts.time,
        endDate: endDateVal,
        endTime: endTimeVal,
      }
    }

    const todayStr = utcToLocalDateParts(new Date().toISOString(), safeTz).date
    const initialDate = prefilledDate || todayStr
    const initialTime = prefilledTime || "09:00"

    return {
      title: "",
      description: "",
      allDay: Boolean(prefilledAllDay),
      startDate: initialDate,
      startTime: initialTime,
      endDate: initialDate,
      endTime: computeDefaultEndTime(initialTime),
    }
  }, [eventToEdit, prefilledDate, prefilledTime, prefilledAllDay, safeTz])

  // Form State initialized from memoized props
  const [title, setTitle] = React.useState(initialValues.title)
  const [description, setDescription] = React.useState(initialValues.description)
  const [allDay, setAllDay] = React.useState(initialValues.allDay)
  const [startDate, setStartDate] = React.useState(initialValues.startDate)
  const [startTime, setStartTime] = React.useState(initialValues.startTime)
  const [endDate, setEndDate] = React.useState(initialValues.endDate)
  const [endTime, setEndTime] = React.useState(initialValues.endTime)

  // Submission State
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please provide an event title.")
      return
    }

    if (!startDate) {
      setError("Please specify a start date.")
      return
    }

    setLoading(true)

    try {
      const payload = {
        id: eventToEdit?.id,
        title: title.trim(),
        description: description.trim() || null,
        all_day: allDay,
        startDate,
        startTime: allDay ? undefined : startTime || "00:00",
        endDate: endDate || startDate,
        endTime: allDay ? undefined : endTime || "01:00",
        timeZone: safeTz,
      }

      const res = isEditing && eventToEdit
        ? await updateCalendarEvent(eventToEdit.id, payload)
        : await createCalendarEvent(payload)

      if (!res.success || !res.data) {
        setError(res.error || "Failed to save event.")
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
    if (!eventToEdit) return
    setError(null)
    setDeleting(true)

    try {
      const res = await deleteCalendarEvent(eventToEdit.id)
      if (!res.success) {
        setError(res.error || "Failed to delete event.")
        setDeleting(false)
        return
      }

      onDelete?.(eventToEdit.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            {isEditing ? "Edit Event" : "Create Event"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3 text-muted-foreground/70" />
            <span>Times displayed and entered in timezone:</span>
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
          <label htmlFor="event-title" className="text-xs font-semibold text-foreground">
            Event Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="event-title"
            placeholder="e.g., Team Sync, Doctor Appointment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading || deleting}
            autoFocus
            className="text-base sm:text-sm font-medium"
          />
        </div>

        {/* All Day Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 min-h-[44px]">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground" />
            <label htmlFor="all-day-toggle" className="text-xs font-medium cursor-pointer touch-manipulation">
              All-Day Event
            </label>
          </div>
          <input
            type="checkbox"
            id="all-day-toggle"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={loading || deleting}
            className="size-5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer touch-manipulation"
          />
        </div>

        {/* Start Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="start-date" className="text-xs font-medium text-foreground">
              Start Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                if (!endDate || endDate < e.target.value) {
                  setEndDate(e.target.value)
                }
              }}
              disabled={loading || deleting}
              className="font-mono text-base sm:text-xs"
            />
          </div>

          {!allDay && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="start-time" className="text-xs font-medium text-foreground">
                Start Time
              </label>
              <Input
                type="time"
                id="start-time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setEndTime(computeDefaultEndTime(e.target.value))
                }}
                disabled={loading || deleting}
                className="font-mono text-base sm:text-xs"
              />
            </div>
          )}
        </div>

        {/* End Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="end-date" className="text-xs font-medium text-foreground">
              End Date
            </label>
            <Input
              type="date"
              id="end-date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading || deleting}
              className="font-mono text-xs"
            />
          </div>

          {!allDay && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="end-time" className="text-xs font-medium text-foreground">
                End Time
              </label>
              <Input
                type="time"
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading || deleting}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-description" className="text-xs font-medium text-foreground">
            Description <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Textarea
            id="event-description"
            placeholder="Add notes, agenda, meeting link, or location..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading || deleting}
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/50">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-1.5 text-xs font-mono"
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
              className="text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || deleting || !title.trim()}
              className="gap-1.5 text-xs font-mono"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Event"}</span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function EventDialog({
  open,
  onOpenChange,
  eventToEdit,
  prefilledDate,
  prefilledTime,
  prefilledAllDay = false,
  timeZone = DEFAULT_TIMEZONE,
  onSuccess,
  onDelete,
}: EventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <EventDialogContentInner
          key={eventToEdit?.id ?? `${prefilledDate}-${prefilledTime}-${prefilledAllDay ? "allday" : "timed"}`}
          eventToEdit={eventToEdit}
          prefilledDate={prefilledDate}
          prefilledTime={prefilledTime}
          prefilledAllDay={prefilledAllDay}
          timeZone={timeZone}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          onDelete={onDelete}
        />
      )}
    </Dialog>
  )
}
