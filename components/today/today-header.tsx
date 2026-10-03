import Link from "next/link"
import {
  Sun,
  Plus,
  Play,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TodayHeaderProps {
  displayName: string
  formattedDate: string
  greeting: string
  pendingDueCount: number
  highPriorityCount: number
  completedTodayCount: number
  focusMinutesToday: number
}

export function TodayHeader({
  displayName,
  formattedDate,
  greeting,
  pendingDueCount,
  highPriorityCount,
  completedTodayCount,
  focusMinutesToday,
}: TodayHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <Sun className="size-3.5 text-amber-500" />
            <span>Daily Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, {displayName}.
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/focus"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 text-xs font-mono min-h-[36px] sm:min-h-0 px-3 touch-manipulation"
            )}
          >
            <Play className="size-3.5 fill-current" />
            <span>Focus Mode</span>
          </Link>
          <a
            href="#quick-task"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5 text-xs font-mono min-h-[36px] sm:min-h-0 px-3 touch-manipulation"
            )}
          >
            <Plus className="size-3.5" />
            <span>Add Task</span>
          </a>
        </div>
      </div>

      {/* Metric summary pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge variant="outline" className="gap-1.5 font-mono text-[11px] py-1 px-2.5">
          <span className="size-1.5 rounded-full bg-amber-500" />
          <span>{pendingDueCount} due today</span>
        </Badge>

        {highPriorityCount > 0 && (
          <Badge
            variant="destructive"
            className="gap-1.5 font-mono text-[11px] py-1 px-2.5"
          >
            <span>{highPriorityCount} high priority</span>
          </Badge>
        )}

        <Badge variant="secondary" className="gap-1.5 font-mono text-[11px] py-1 px-2.5">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span>{completedTodayCount} completed</span>
        </Badge>

        {focusMinutesToday > 0 && (
          <Badge variant="outline" className="gap-1.5 font-mono text-[11px] py-1 px-2.5">
            <Clock className="size-3 text-muted-foreground" />
            <span>{focusMinutesToday}m focused</span>
          </Badge>
        )}
      </div>
    </div>
  )
}
