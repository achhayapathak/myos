"use client"

import * as React from "react"
import { Plus, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { createQuickTask } from "@/app/(app)/today/actions"
import type { TaskPriority } from "@/types/database"
import { cn } from "@/lib/utils"

function getLocalDateStr(date: Date, timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date) // "YYYY-MM-DD"
}

function getTomorrowDateStr(todayStr: string): string {
  const [y, m, d] = todayStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

function toDateStr(year: number, monthIndex: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

function getDateButtonLabel(selectedDate: string, todayStr: string, tomorrowStr: string): string {
  if (!selectedDate) return "No date"
  if (selectedDate === todayStr) return "Today"
  if (selectedDate === tomorrowStr) return "Tomorrow"
  const [y, m, d] = selectedDate.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(dt)
}

export function QuickTaskForm() {
  const [title, setTitle] = React.useState("")
  const [priority, setPriority] = React.useState<TaskPriority>("medium")
  
  // Date state
  const todayStr = React.useMemo(() => getLocalDateStr(new Date()), [])
  const tomorrowStr = React.useMemo(() => getTomorrowDateStr(todayStr), [todayStr])
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr)
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState<Date>(() => new Date())

  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Calendar month details
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(viewDate)

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const buttonLabel = getDateButtonLabel(selectedDate, todayStr, tomorrowStr)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || isPending) return

    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append("title", title.trim())
    formData.append("priority", priority)
    if (selectedDate) {
      formData.append("dueDate", selectedDate)
      if (selectedDate === todayStr) {
        formData.append("dueToday", "true")
      }
    }

    startTransition(async () => {
      const res = await createQuickTask(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setTitle("")
        setSelectedDate(todayStr)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        inputRef.current?.focus()
      }
    })
  }

  return (
    <div
      id="quick-task"
      className="rounded-xl border border-border/70 bg-card p-4 shadow-xs"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="quick-task-input"
            className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5"
          >
            <Plus className="size-3.5 text-muted-foreground" />
            <span>Quick Task</span>
          </label>
          <div className="flex items-center gap-1.5">
            {success && (
              <span className="text-[11px] font-mono text-emerald-500 animate-in fade-in">
                Added!
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">
              Press Enter to add
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="quick-task-input"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done? (e.g. Deploy release, update docs...)"
            disabled={isPending}
            className="flex-1 text-base sm:text-xs font-sans h-9 sm:h-8.5 bg-muted/20"
            autoComplete="off"
            required
          />

          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
            {/* Priority Selector */}
            <div
              role="radiogroup"
              aria-label="Task priority"
              className="flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5 text-[11px] font-mono shrink-0"
            >
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={priority === p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-2.5 py-1 min-h-[30px] rounded capitalize transition-all cursor-pointer touch-manipulation",
                    priority === p
                      ? p === "high"
                        ? "bg-destructive text-destructive-foreground font-semibold"
                        : "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Due date calendar picker popover */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-7.5 rounded-lg border text-[11px] font-mono transition-colors shrink-0 cursor-pointer touch-manipulation",
                      selectedDate === todayStr
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                        : selectedDate
                        ? "border-primary/50 bg-primary/10 text-primary font-medium"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                    title={selectedDate ? `Due: ${buttonLabel}` : "Choose a due date"}
                  >
                    <Calendar className="size-3" />
                    <span>{buttonLabel}</span>
                  </button>
                }
              />
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-[280px] p-3 z-50 bg-card border border-border/80 shadow-lg rounded-xl"
              >
                <div className="flex flex-col gap-2.5 select-none">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-xs font-semibold font-mono text-foreground">
                      {monthName} {viewYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
                      aria-label="Next month"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 text-center">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <span key={day} className="text-[10px] font-mono text-muted-foreground/70 py-0.5">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Month days grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <span key={`blank-${i}`} className="size-7" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateStr = toDateStr(viewYear, viewMonth, day)
                      const isSelected = selectedDate === dateStr
                      const isToday = todayStr === dateStr

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dateStr)
                            setPopoverOpen(false)
                          }}
                          className={cn(
                            "size-7 rounded-md text-xs font-mono flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : isToday
                              ? "border border-amber-500/60 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/10"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(todayStr)
                          setViewDate(new Date())
                          setPopoverOpen(false)
                        }}
                        className="px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(tomorrowStr)
                          setViewDate(new Date(Date.now() + 86400000))
                          setPopoverOpen(false)
                        }}
                        className="px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Tomorrow
                      </button>
                    </div>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate("")
                          setPopoverOpen(false)
                        }}
                        className="px-2 py-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="submit"
              size="sm"
              disabled={isPending || !title.trim()}
              className="font-mono text-xs gap-1.5 h-8 sm:h-7.5 px-3 shrink-0 cursor-pointer touch-manipulation"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>Add</span>
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-[11px] font-mono text-destructive">{error}</p>
        )}
      </form>
    </div>
  )
}
