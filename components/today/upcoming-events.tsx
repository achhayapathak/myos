import Link from "next/link"
import { Calendar, ArrowRight, Clock, MapPin, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Event } from "@/types/database"
import { formatEventTime } from "@/lib/today-utils"

interface UpcomingEventsProps {
  events: Event[]
  timeZone?: string
}

export function UpcomingEvents({ events, timeZone }: UpcomingEventsProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              Upcoming Schedule
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-lg border border-dashed border-border/60 bg-muted/10">
            <div className="size-10 rounded-full bg-muted/30 flex items-center justify-center mb-2.5">
              <CalendarDays className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-foreground">No upcoming events</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 max-w-[220px]">
              Your schedule is completely clear for the day.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const formattedTime = formatEventTime(
                event.start_at,
                event.end_at,
                event.all_day,
                timeZone
              )

              return (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/15 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground pt-0.5 shrink-0">
                      <Clock className="size-3" />
                      <span>{formattedTime}</span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">
                        {event.title}
                      </span>
                      {event.description && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="size-2.5 shrink-0" />
                          <span>{event.description}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {event.all_day && (
                    <Badge variant="outline" className="text-[9px] font-mono h-4 px-1 shrink-0">
                      All Day
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-border/40">
        <Link
          href="/calendar"
          className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <span>Open calendar</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}
