import {
  Bell,
  Plus,
  Clock,
  Smartphone,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Reminders",
}

const SAMPLE_REMINDERS = [
  {
    id: "1",
    title: "Deploy JoinUp release to production",
    remindAt: "Today at 18:00",
    channel: "Push Notification",
    completed: false,
  },
  {
    id: "2",
    title: "Review daily metrics and active sessions",
    remindAt: "Today at 21:00",
    channel: "Push Notification",
    completed: false,
  },
  {
    id: "3",
    title: "Take short break & hydrate",
    remindAt: "Tomorrow at 11:30",
    channel: "In-App Banner",
    completed: false,
  },
]

export default function RemindersPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <Bell className="size-3.5" />
            <span>Time-based Alerts</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Reminders
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            2 scheduled · 1 recurring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 font-mono text-xs">
            <Plus className="size-3.5" />
            <span>New Reminder</span>
          </Button>
        </div>
      </div>

      {/* Push Subscription Card */}
      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground">
            <Smartphone className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              Web Push Delivery
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Notifications trigger seamlessly on mobile and desktop devices
            </span>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px] w-fit">
          Ready for registration
        </Badge>
      </div>

      {/* Reminders List */}
      <div className="flex flex-col gap-2">
        {SAMPLE_REMINDERS.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Mark reminder "${reminder.title}" complete`}
                className="size-5 rounded-md border border-border hover:border-foreground flex items-center justify-center transition-colors shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  {reminder.title}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="size-2.5" />
                  <span>{reminder.remindAt}</span>
                  <span>•</span>
                  <span>{reminder.channel}</span>
                </span>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-[10px]">
              Scheduled
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
