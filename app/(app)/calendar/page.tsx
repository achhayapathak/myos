import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Calendar",
}

const SCHEDULE_ITEMS = [
  {
    id: "1",
    time: "10:30 - 11:00",
    title: "Engineering Standup",
    location: "Google Meet",
    tag: "Work",
  },
  {
    id: "2",
    time: "14:00 - 15:30",
    title: "Supabase Schema & RLS Review",
    location: "Dev Room",
    tag: "Architecture",
  },
  {
    id: "3",
    time: "18:30 - 19:30",
    title: "Gym / Strength Training",
    location: "Fitness Center",
    tag: "Personal",
  },
]

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <CalendarIcon className="size-3.5" />
            <span>Internal Schedule</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Calendar
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            September 2026
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-mono">
            <button
              type="button"
              className="px-2.5 py-1 rounded-md bg-foreground text-background font-semibold"
            >
              Day
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              Week
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              Month
            </button>
          </div>

          <Button size="sm" className="gap-1.5 font-mono text-xs">
            <Plus className="size-3.5" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm">
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon-sm">
            <ChevronRight className="size-3.5" />
          </Button>
          <span className="font-semibold text-xs font-mono ml-2">
            Today, Monday, Sep 28
          </span>
        </div>

        <Button variant="ghost" size="xs" className="font-mono text-xs">
          Jump to Today
        </Button>
      </div>

      {/* Schedule Items for the Day */}
      <div className="flex flex-col gap-3">
        {SCHEDULE_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors shadow-2xs"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-0.5 shrink-0 w-28">
                <Clock className="size-3 text-muted-foreground" />
                <span>{item.time}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {item.title}
                </span>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" />
                  <span>{item.location}</span>
                </span>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-[10px]">
              {item.tag}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
