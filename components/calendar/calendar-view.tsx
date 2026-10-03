"use client"

import * as React from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import momentTimezonePlugin from "@fullcalendar/moment-timezone"
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core"
import type { DateClickArg } from "@fullcalendar/interaction"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Globe,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Event as DbEvent } from "@/types/database"
import type { CalendarViewMode } from "@/lib/calendar/types"
import {
  toFullCalendarEvent,
  resolveTimeZone,
  DEFAULT_TIMEZONE,
} from "@/lib/calendar/timezone-utils"
import { EventDialog } from "./event-dialog"

interface CalendarViewProps {
  initialEvents: DbEvent[]
  timeZone?: string
}

const emptySubscribe = () => () => {}

export function CalendarView({
  initialEvents,
  timeZone = DEFAULT_TIMEZONE,
}: CalendarViewProps) {
  const safeTz = resolveTimeZone(timeZone)
  const calendarRef = React.useRef<FullCalendar | null>(null)

  // Avoid hydration mismatch using useSyncExternalStore
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // State
  const [events, setEvents] = React.useState<DbEvent[]>(initialEvents)
  const [prevInitialEvents, setPrevInitialEvents] = React.useState(initialEvents)
  const [currentView, setCurrentView] = React.useState<CalendarViewMode>("dayGridMonth")
  const [viewTitle, setViewTitle] = React.useState("")

  // Adjust state during render if initialEvents prop updates from server revalidation
  if (initialEvents !== prevInitialEvents) {
    setPrevInitialEvents(initialEvents)
    setEvents(initialEvents)
  }

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedEvent, setSelectedEvent] = React.useState<DbEvent | null>(null)
  const [prefilledDate, setPrefilledDate] = React.useState<string | null>(null)
  const [prefilledTime, setPrefilledTime] = React.useState<string | null>(null)
  const [prefilledAllDay, setPrefilledAllDay] = React.useState(false)

  // Map database events to FullCalendar event format
  const fcEvents = React.useMemo(() => {
    return events.map((ev) => toFullCalendarEvent(ev, safeTz))
  }, [events, safeTz])

  // Command palette and deep link listener for event selection
  React.useEffect(() => {
    const handleSelectEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ eventId: string }>
      const eventId = customEvent.detail?.eventId
      if (eventId) {
        const found = events.find((ev) => ev.id === eventId)
        if (found) {
          setSelectedEvent(found)
          setPrefilledDate(null)
          setPrefilledTime(null)
          setPrefilledAllDay(false)
          setDialogOpen(true)
          calendarRef.current?.getApi()?.gotoDate(found.start_at)
        }
      }
    }

    window.addEventListener("myos:select-event", handleSelectEvent)

    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const eventId = params.get("eventId")
        if (eventId) {
          const found = events.find((ev) => ev.id === eventId)
          if (found) {
            setSelectedEvent(found)
            setPrefilledDate(null)
            setPrefilledTime(null)
            setPrefilledAllDay(false)
            setDialogOpen(true)
            calendarRef.current?.getApi()?.gotoDate(found.start_at)
            window.history.replaceState({}, "", window.location.pathname)
          }
        }
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("myos:select-event", handleSelectEvent)
    }
  }, [events])

  // Calendar Navigation Handlers
  const handlePrev = () => {
    const api = calendarRef.current?.getApi()
    if (api) {
      api.prev()
    }
  }

  const handleNext = () => {
    const api = calendarRef.current?.getApi()
    if (api) {
      api.next()
    }
  }

  const handleToday = () => {
    const api = calendarRef.current?.getApi()
    if (api) {
      api.today()
    }
  }

  const handleViewChange = (view: CalendarViewMode) => {
    setCurrentView(view)
    const api = calendarRef.current?.getApi()
    if (api) {
      api.changeView(view)
    }
  }

  const handleDatesSet = (arg: DatesSetArg) => {
    setViewTitle(arg.view.title)
    setCurrentView(arg.view.type as CalendarViewMode)
  }

  // Click on existing event -> open Edit Dialog
  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault()
    const found = events.find((e) => e.id === info.event.id)
    if (found) {
      setSelectedEvent(found)
      setPrefilledDate(null)
      setPrefilledTime(null)
      setPrefilledAllDay(false)
      setDialogOpen(true)
    }
  }

  // Click on empty day or time slot -> open Create Dialog
  const handleDateClick = (info: DateClickArg) => {
    setSelectedEvent(null)
    setPrefilledAllDay(info.allDay)

    if (info.allDay) {
      // Month view date click (e.g., "2026-10-03")
      setPrefilledDate(info.dateStr.slice(0, 10))
      setPrefilledTime(null)
    } else {
      // Timegrid slot click (e.g., "2026-10-03T14:30:00+05:30")
      const dateParts = info.dateStr.split("T")
      setPrefilledDate(dateParts[0] || null)
      if (dateParts[1]) {
        setPrefilledTime(dateParts[1].slice(0, 5))
      } else {
        setPrefilledTime(null)
      }
    }
    setDialogOpen(true)
  }

  const handleNewEventBtn = () => {
    setSelectedEvent(null)
    setPrefilledDate(null)
    setPrefilledTime(null)
    setPrefilledAllDay(false)
    setDialogOpen(true)
  }

  // Event mutation callbacks to keep UI optimistic and responsive
  const handleEventSuccess = (savedEvent: DbEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEvent.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = savedEvent
        return copy
      }
      return [...prev, savedEvent]
    })
  }

  const handleEventDelete = (deletedId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== deletedId))
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <CalendarIcon className="size-3.5" />
            <span>Interactive Schedule</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Calendar
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] gap-1 px-2 py-0.5">
              <Globe className="size-3 text-muted-foreground" />
              <span>{safeTz}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Manage your schedule, commitments, and deadlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleViewChange("dayGridMonth")}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[32px] rounded-md font-semibold transition-all cursor-pointer touch-manipulation ${
                currentView === "dayGridMonth"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("timeGridWeek")}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[32px] rounded-md font-semibold transition-all cursor-pointer touch-manipulation ${
                currentView === "timeGridWeek"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("timeGridDay")}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[32px] rounded-md font-semibold transition-all cursor-pointer touch-manipulation ${
                currentView === "timeGridDay"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Day
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleNewEventBtn}
            className="gap-1.5 font-mono text-xs shadow-2xs min-h-[34px] px-3 cursor-pointer touch-manipulation"
          >
            <Plus className="size-3.5" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border border-border/60 bg-card shadow-2xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePrev}
            aria-label="Previous period"
            className="size-8 cursor-pointer touch-manipulation"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNext}
            aria-label="Next period"
            className="size-8 cursor-pointer touch-manipulation"
          >
            <ChevronRight className="size-4" />
          </Button>

          <span className="font-semibold text-xs sm:text-sm font-sans tracking-tight ml-1 sm:ml-2">
            {viewTitle || "Loading calendar..."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="font-mono text-xs h-8 px-2.5 sm:px-3 cursor-pointer touch-manipulation"
          >
            Jump to Today
          </Button>
        </div>
      </div>

      {/* FullCalendar Container */}
      <div className="relative rounded-2xl border border-border/60 bg-card p-1.5 sm:p-5 shadow-2xs overflow-hidden min-h-[520px] sm:min-h-[620px]">
        {!mounted ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs font-mono">Initializing calendar...</p>
          </div>
        ) : (
          <div className="myos-fullcalendar-wrapper">
            <FullCalendar
              ref={calendarRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                momentTimezonePlugin,
              ]}
              initialView={currentView}
              timeZone={safeTz}
              headerToolbar={false} // Managed via our custom toolbar above
              events={fcEvents}
              editable={false}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={3}
              weekends={true}
              nowIndicator={true}
              height="auto"
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              allDaySlot={true}
              allDayText="All Day"
              slotDuration="00:30:00"
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
            />
          </div>
        )}
      </div>

      {/* Event Create / Edit / Delete Dialog */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventToEdit={selectedEvent}
        prefilledDate={prefilledDate}
        prefilledTime={prefilledTime}
        prefilledAllDay={prefilledAllDay}
        timeZone={safeTz}
        onSuccess={handleEventSuccess}
        onDelete={handleEventDelete}
      />
    </div>
  )
}
