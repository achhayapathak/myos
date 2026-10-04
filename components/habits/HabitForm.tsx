"use client"

import * as React from "react"
import { Loader2, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createHabit, updateHabit } from "@/app/(app)/habits/actions"
import type { Habit } from "@/types/database"
import { createHabitSchema, updateHabitSchema } from "@/lib/habits/validation"

export interface HabitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  habit?: Habit | null
  onSuccess?: (savedHabit: Habit) => void
}

const ISO_DAYS = [
  { day: 1, label: "Mon", full: "Monday" },
  { day: 2, label: "Tue", full: "Tuesday" },
  { day: 3, label: "Wed", full: "Wednesday" },
  { day: 4, label: "Thu", full: "Thursday" },
  { day: 5, label: "Fri", full: "Friday" },
  { day: 6, label: "Sat", full: "Saturday" },
  { day: 7, label: "Sun", full: "Sunday" },
]

interface HabitFormFieldsProps {
  habit?: Habit | null
  onClose: () => void
  onSuccess?: (savedHabit: Habit) => void
}

function HabitFormFields({ habit, onClose, onSuccess }: HabitFormFieldsProps) {
  const isEditing = Boolean(habit)

  const [name, setName] = React.useState(habit?.name || "")
  const [description, setDescription] = React.useState(habit?.description || "")
  const [frequencyType, setFrequencyType] = React.useState<"daily" | "weekly">(
    habit?.frequency_type || "daily"
  )
  const [targetDays, setTargetDays] = React.useState<number[]>(
    habit?.target_days && habit.target_days.length > 0
      ? habit.target_days
      : [1, 2, 3, 4, 5]
  )
  const [reminderTime, setReminderTime] = React.useState<string>(
    habit?.reminder_time || ""
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const toggleDay = (day: number) => {
    setTargetDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day)
      } else {
        return [...prev, day].sort((a, b) => a - b)
      }
    })
  }

  const setWeekdayPreset = () => setTargetDays([1, 2, 3, 4, 5])
  const setWeekendPreset = () => setTargetDays([6, 7])
  const setEverydayPreset = () => setTargetDays([1, 2, 3, 4, 5, 6, 7])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      name,
      description: description.trim() ? description.trim() : null,
      frequency_type: frequencyType,
      target_days: frequencyType === "weekly" ? targetDays : null,
      reminder_time: reminderTime.trim() ? reminderTime.trim() : null,
    }

    if (isEditing && habit) {
      const validation = updateHabitSchema.safeParse({ ...payload, id: habit.id })
      if (!validation.success) {
        setError(validation.error.issues[0]?.message || "Validation failed.")
        return
      }

      startTransition(async () => {
        const res = await updateHabit(habit.id, payload)
        if (res.success && res.data) {
          onSuccess?.(res.data)
          onClose()
        } else {
          setError(res.error || "Failed to update habit.")
        }
      })
    } else {
      const validation = createHabitSchema.safeParse(payload)
      if (!validation.success) {
        setError(validation.error.issues[0]?.message || "Validation failed.")
        return
      }

      startTransition(async () => {
        const res = await createHabit(payload)
        if (res.success && res.data) {
          onSuccess?.(res.data)
          onClose()
        } else {
          setError(res.error || "Failed to create habit.")
        }
      })
    }
  }

  return (
    <>
      <DialogHeader className="pb-2 border-b border-border/60">
        <DialogTitle className="text-base font-semibold text-foreground">
          {isEditing ? "Edit Habit" : "Create Habit"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {isEditing
            ? "Update your habit schedule and configuration"
            : "Set up a clean, daily or weekly habit"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono">
            {error}
          </div>
        )}

        {/* Name Field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-name-input" className="text-xs font-medium text-foreground">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="habit-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Workout, Read, Drink water"
            required
            autoFocus
            maxLength={100}
            className="h-9 text-sm"
            disabled={isPending}
          />
        </div>

        {/* Description Field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-description-input" className="text-xs font-medium text-foreground flex justify-between">
            <span>Description / Note</span>
            <span className="text-[10px] text-muted-foreground font-mono">Optional</span>
          </label>
          <Textarea
            id="habit-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 30 minutes, 10 pages, before breakfast"
            rows={2}
            maxLength={500}
            className="resize-none text-xs"
            disabled={isPending}
          />
        </div>

        {/* Frequency Type Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Frequency</span>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/40 border border-border/60">
            <button
              type="button"
              onClick={() => setFrequencyType("daily")}
              className={cn(
                "py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer touch-manipulation",
                frequencyType === "daily"
                  ? "bg-background text-foreground font-semibold shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setFrequencyType("weekly")}
              className={cn(
                "py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer touch-manipulation",
                frequencyType === "weekly"
                  ? "bg-background text-foreground font-semibold shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Target Days for Weekly Habits */}
        {frequencyType === "weekly" && (
          <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Target Days</span>
              {/* Presets */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <button
                  type="button"
                  onClick={setWeekdayPreset}
                  className="hover:text-foreground underline decoration-muted-foreground/40 cursor-pointer"
                >
                  Weekdays
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={setWeekendPreset}
                  className="hover:text-foreground underline decoration-muted-foreground/40 cursor-pointer"
                >
                  Weekends
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={setEverydayPreset}
                  className="hover:text-foreground underline decoration-muted-foreground/40 cursor-pointer"
                >
                  All
                </button>
              </div>
            </div>

            {/* Day buttons */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {ISO_DAYS.map((item) => {
                const isSelected = targetDays.includes(item.day)
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => toggleDay(item.day)}
                    aria-pressed={isSelected}
                    aria-label={`${item.full} target day`}
                    className={cn(
                      "h-9 rounded-md flex flex-col items-center justify-center text-xs font-mono transition-all cursor-pointer border touch-manipulation",
                      isSelected
                        ? "bg-foreground text-background font-semibold border-foreground shadow-2xs"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {targetDays.length === 0 && (
              <span className="text-[11px] text-destructive">
                Select at least one day for weekly habit.
              </span>
            )}
          </div>
        )}

        {/* Optional Reminder Time */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between">
            <label
              htmlFor="habit-reminder-time"
              className="text-xs font-medium text-foreground flex items-center gap-1.5"
            >
              <Bell className="size-3.5 text-muted-foreground" />
              <span>Daily Reminder Time (Optional)</span>
            </label>
            {reminderTime && (
              <button
                type="button"
                onClick={() => setReminderTime("")}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear time
              </button>
            )}
          </div>
          <Input
            id="habit-reminder-time"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="h-9 font-mono text-sm bg-background border-border/70"
          />
          <p className="text-[11px] text-muted-foreground">
            Get an instant push notification at this time on scheduled days.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !name.trim() || (frequencyType === "weekly" && targetDays.length === 0)}
            className="gap-1.5 min-w-[90px]"
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            <span>{isEditing ? "Save Changes" : "Create Habit"}</span>
          </Button>
        </div>
      </form>
    </>
  )
}

export function HabitForm({
  open,
  onOpenChange,
  habit,
  onSuccess,
}: HabitFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-md p-5 rounded-xl bg-popover ring-1 ring-foreground/10 shadow-xl"
        showCloseButton={true}
      >
        {open && (
          <HabitFormFields
            key={habit?.id || "new-habit"}
            habit={habit}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
