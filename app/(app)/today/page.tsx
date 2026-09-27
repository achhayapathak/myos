import Link from "next/link"
import {
  Sun,
  Timer,
  CheckSquare,
  Calendar,
  FileText,
  Plus,
  Play,
  ArrowRight,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Today",
}

export default function TodayPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <Sun className="size-3.5 text-amber-500" />
            <span>Today Overview</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Good day.
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {currentDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 text-xs font-mono"
            )}
          >
            <Plus className="size-3.5" />
            <span>New Task</span>
          </Link>
          <Link
            href="/focus"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5 text-xs font-mono"
            )}
          >
            <Play className="size-3.5 fill-current" />
            <span>Focus</span>
          </Link>
        </div>
      </div>

      {/* Grid of Dashboard Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TODAY TASKS (Span 2 cols on desktop) */}
        <div className="md:col-span-2 rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <CheckSquare className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                  Today&apos;s Tasks
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">3 pending</span>
            </div>

            {/* Task Items Placeholder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="size-4 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:border-foreground transition-colors" />
                  <span className="text-xs font-medium">Finish payment implementation</span>
                </div>
                <Badge variant="destructive" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4.5">
                  High
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="size-4 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:border-foreground transition-colors" />
                  <span className="text-xs font-medium">Review PR for Supabase RLS migrations</span>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4.5">
                  Medium
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="size-4 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:border-foreground transition-colors" />
                  <span className="text-xs font-medium">Write technical documentation</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4.5">
                  Low
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
            <Link
              href="/tasks"
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>View all tasks</span>
              <ArrowRight className="size-3" />
            </Link>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Press ⌥2 to jump
            </span>
          </div>
        </div>

        {/* FOCUS TIMER CARD */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                  Focus
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5">
                25 min
              </Badge>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-4xl font-mono font-bold tracking-tight text-foreground">
                25:00
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                Deep work session
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/focus"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "w-full gap-2 font-mono text-xs"
              )}
            >
              <Play className="size-3.5 fill-current" />
              <span>Start Focus</span>
            </Link>
            <span className="text-[10px] font-mono text-center text-muted-foreground/60">
              Auto-pauses on break
            </span>
          </div>
        </div>

        {/* UPCOMING EVENTS */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                  Upcoming
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Today</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-[11px] font-mono text-muted-foreground pt-0.5 shrink-0 w-12">
                  10:30
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">Standup</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Internal Sync</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-[11px] font-mono text-muted-foreground pt-0.5 shrink-0 w-12">
                  14:00
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">Architecture Review</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Sprint Planning</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-[11px] font-mono text-muted-foreground pt-0.5 shrink-0 w-12">
                  18:30
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">Gym / Workout</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Personal</span>
                </div>
              </div>
            </div>
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

        {/* QUICK NOTE CARD (Span 2 cols on desktop) */}
        <div className="md:col-span-2 rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                  Quick Note
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Markdown ready</span>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                placeholder="What's on your mind? (Quick thoughts, scratchpad, ideas...)"
                className="w-full resize-none rounded-lg border border-border/60 bg-muted/20 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                readOnly
              />
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
              <Clock className="size-3" />
              <span>Autosaves to scratchpad</span>
            </span>
            <Link
              href="/notes"
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>All notes</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
