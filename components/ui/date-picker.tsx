"use client"

import * as React from "react"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface CalendarCell {
  dateStr: string
  day: number
  isCurrentMonth: boolean
  isPrevMonth: boolean
  isNextMonth: boolean
}

/**
 * Returns a "YYYY-MM-DD" local date string from Year, Month index (0-11), and Day.
 */
export function formatYearMonthDay(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Returns today's local date in "YYYY-MM-DD" format.
 */
export function getTodayDateString(): string {
  const now = new Date()
  return formatYearMonthDay(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Returns tomorrow's local date in "YYYY-MM-DD" format.
 */
export function getTomorrowDateString(todayStr = getTodayDateString()): string {
  const [y, m, d] = todayStr.split("-").map(Number)
  return formatYearMonthDay(y, m - 1, d + 1)
}

/**
 * Formats a selected date into a friendly label for buttons or chips.
 */
export function getDateButtonLabel(
  selectedDate: string,
  todayStr = getTodayDateString(),
  tomorrowStr = getTomorrowDateString(todayStr)
): string {
  if (!selectedDate) return "Pick a date"
  if (selectedDate === todayStr) return "Today"
  if (selectedDate === tomorrowStr) return "Tomorrow"

  const [y, m, d] = selectedDate.split("-").map(Number)
  if (!y || !m || !d) return selectedDate

  const dt = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dt)
}

/**
 * Computes the 42 cells (6 rows x 7 columns) for a full, stable calendar view.
 * Includes preceding month's trailing days and following month's leading days.
 */
export function getCalendarGridCells(year: number, monthIndex: number): CalendarCell[] {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay() // 0 = Sunday
  const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()

  const cells: CalendarCell[] = []

  // Preceding month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push({
      dateStr: formatYearMonthDay(year, monthIndex - 1, day),
      day,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
    })
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    cells.push({
      dateStr: formatYearMonthDay(year, monthIndex, day),
      day,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
    })
  }

  // Following month leading days (fill remaining of 42 cells)
  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      dateStr: formatYearMonthDay(year, monthIndex + 1, day),
      day,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
    })
  }

  return cells
}

export interface CalendarPanelProps {
  selectedDate?: string
  onSelectDate: (dateStr: string) => void
  onClose?: () => void
  showPresets?: boolean
  className?: string
}

/**
 * CalendarPanel: The themed calendar dropdown contents matching MyOS platform aesthetics.
 */
export function CalendarPanel({
  selectedDate = "",
  onSelectDate,
  onClose,
  showPresets = true,
  className,
}: CalendarPanelProps) {
  const todayStr = React.useMemo(() => getTodayDateString(), [])
  const tomorrowStr = React.useMemo(() => getTomorrowDateString(todayStr), [todayStr])

  const [prevSelectedDate, setPrevSelectedDate] = React.useState(selectedDate)
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number)
      if (y && m && d) return new Date(y, m - 1, 1)
    }
    return new Date()
  })

  // Keep viewDate in sync during render if selectedDate changes
  if (prevSelectedDate !== selectedDate) {
    setPrevSelectedDate(selectedDate)
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number)
      if (y && m && d) {
        setViewDate(new Date(y, m - 1, 1))
      }
    }
  }

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const monthName = React.useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long" }).format(viewDate)
  }, [viewDate])

  const cells = React.useMemo(() => {
    return getCalendarGridCells(viewYear, viewMonth)
  }, [viewYear, viewMonth])

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const jumpToToday = () => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const isCurrentMonthActive = React.useMemo(() => {
    const now = new Date()
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth
  }, [viewYear, viewMonth])

  const handleDayClick = (cell: CalendarCell) => {
    onSelectDate(cell.dateStr)
    if (!cell.isCurrentMonth) {
      const [y, m] = cell.dateStr.split("-").map(Number)
      setViewDate(new Date(y, m - 1, 1))
    }
    onClose?.()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 select-none font-mono text-xs text-foreground",
        className
      )}
    >
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer touch-manipulation active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {monthName} {viewYear}
          </span>
          {!isCurrentMonthActive && (
            <button
              type="button"
              onClick={jumpToToday}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Return to current month"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer touch-manipulation active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span
            key={day}
            className="text-[10px] font-semibold text-muted-foreground/60 py-0.5 uppercase tracking-wider"
          >
            {day}
          </span>
        ))}
      </div>

      {/* 42-day Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {cells.map((cell) => {
          const isSelected = selectedDate === cell.dateStr
          const isToday = todayStr === cell.dateStr

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => handleDayClick(cell)}
              className={cn(
                "relative size-7.5 sm:size-7 rounded-md text-xs font-mono flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none active:scale-95",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary/30"
                  : isToday
                  ? "border border-amber-500/60 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 hover:bg-amber-500/20"
                  : cell.isCurrentMonth
                  ? "text-foreground hover:bg-muted hover:text-foreground"
                  : "text-muted-foreground/35 hover:text-muted-foreground/80 hover:bg-muted/40 font-normal"
              )}
              aria-label={`Select ${cell.dateStr}`}
            >
              <span>{cell.day}</span>
              {/* Distinct amber dot indicator for Today when selected */}
              {isToday && isSelected && (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-400 ring-1 ring-background" />
              )}
            </button>
          )
        })}
      </div>

      {/* Quick Presets Bar */}
      {showPresets && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-mono">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onSelectDate(todayStr)
                jumpToToday()
                onClose?.()
              }}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer touch-manipulation",
                selectedDate === todayStr
                  ? "border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectDate(tomorrowStr)
                const [y, m] = tomorrowStr.split("-").map(Number)
                setViewDate(new Date(y, m - 1, 1))
                onClose?.()
              }}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer touch-manipulation",
                selectedDate === tomorrowStr
                  ? "border border-primary/50 bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const [y, m, d] = todayStr.split("-").map(Number)
                const nextWeekStr = formatYearMonthDay(y, m - 1, d + 7)
                onSelectDate(nextWeekStr)
                const [ny, nm] = nextWeekStr.split("-").map(Number)
                setViewDate(new Date(ny, nm - 1, 1))
                onClose?.()
              }}
              className="px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer touch-manipulation"
            >
              +1w
            </button>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                onSelectDate("")
                onClose?.()
              }}
              className="px-2 py-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer touch-manipulation"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export interface DatePickerProps {
  id?: string
  name?: string
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  variant?: "input" | "chip"
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  showPresets?: boolean
  required?: boolean
  "aria-label"?: string
}

/**
 * DatePicker: A unified, platform-styled calendar date picker dropdown for tasks, reminders, and forms.
 */
export function DatePicker({
  id,
  name,
  value = "",
  onChange,
  disabled = false,
  placeholder = "Select date",
  className,
  variant = "input",
  align = "start",
  side = "bottom",
  showPresets = true,
  required = false,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const todayStr = React.useMemo(() => getTodayDateString(), [])
  const tomorrowStr = React.useMemo(() => getTomorrowDateString(todayStr), [todayStr])

  const buttonLabel = getDateButtonLabel(value, todayStr, tomorrowStr)
  const isToday = value === todayStr
  const isTomorrow = value === tomorrowStr

  // Chip Variant: Compact button trigger (e.g. for QuickTaskForm)
  if (variant === "chip") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              id={id}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-7.5 rounded-lg border text-[11px] font-mono transition-all shrink-0 cursor-pointer touch-manipulation",
                isToday
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/20"
                  : value
                  ? "border-primary/50 bg-primary/10 text-primary font-medium hover:bg-primary/20"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40",
                disabled && "opacity-50 cursor-not-allowed",
                className
              )}
              title={value ? `Due: ${buttonLabel} (${value})` : "Choose a due date"}
              aria-label={ariaLabel || (value ? `Due date: ${buttonLabel}` : "Choose a due date")}
            >
              <Calendar className="size-3 shrink-0" />
              <span>{buttonLabel}</span>
            </button>
          }
        />
        <PopoverContent
          align={align}
          side={side}
          sideOffset={6}
          className="w-[280px] p-3 z-50 bg-card border border-border/80 shadow-lg ring-1 ring-foreground/5 rounded-xl backdrop-blur-xs"
        >
          <CalendarPanel
            selectedDate={value}
            onSelectDate={(newDate) => {
              onChange(newDate)
              setOpen(false)
            }}
            onClose={() => setOpen(false)}
            showPresets={showPresets}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Input Variant: Standard full form control (for TaskFormDialog, ReminderDialog, etc.)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "group/date-picker relative flex items-center w-full h-9 sm:h-8.5 rounded-md border border-input bg-card shadow-2xs transition-all hover:border-foreground/30 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
          disabled && "opacity-50 pointer-events-none bg-muted/30",
          className
        )}
      >
        {/* Calendar Trigger Icon */}
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              className="flex items-center justify-center pl-2.5 pr-1.5 h-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation shrink-0"
              aria-label="Open calendar dropdown"
            >
              <Calendar className="size-3.5 text-muted-foreground group-hover/date-picker:text-foreground transition-colors" />
            </button>
          }
        />

        {/* Text Input displaying and allowing direct date editing & E2E fill() */}
        <input
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          className="flex-1 min-w-0 h-full bg-transparent px-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none"
        />

        {/* Friendly relative day badge (Today / Tomorrow) */}
        {isToday && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 mr-1.5 select-none animate-in fade-in duration-150">
            Today
          </span>
        )}
        {isTomorrow && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border border-border/60 bg-muted/40 text-muted-foreground mr-1.5 select-none animate-in fade-in duration-150">
            Tomorrow
          </span>
        )}

        {/* Clear Button (shown when a date is selected) */}
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            className="size-6 mr-1 flex items-center justify-center rounded text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer touch-manipulation shrink-0"
            aria-label="Clear date"
            title="Clear date"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        className="w-[280px] p-3 z-50 bg-card border border-border/80 shadow-lg ring-1 ring-foreground/5 rounded-xl backdrop-blur-xs"
      >
        <CalendarPanel
          selectedDate={value}
          onSelectDate={(newDate) => {
            onChange(newDate)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
          showPresets={showPresets}
        />
      </PopoverContent>
    </Popover>
  )
}
