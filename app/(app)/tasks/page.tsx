import {
  CheckSquare,
  Plus,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Tasks",
}

const SAMPLE_TASKS = [
  {
    id: "1",
    title: "Finish payment implementation",
    priority: "high",
    status: "todo",
    due: "Today",
    category: "Work",
  },
  {
    id: "2",
    title: "Review PR for Supabase RLS migrations",
    priority: "medium",
    status: "in_progress",
    due: "Today",
    category: "Engineering",
  },
  {
    id: "3",
    title: "Configure Web Push notification service worker",
    priority: "high",
    status: "todo",
    due: "Tomorrow",
    category: "PWA",
  },
  {
    id: "4",
    title: "Write technical documentation for MyOS architecture",
    priority: "low",
    status: "todo",
    due: "Sep 30",
    category: "Docs",
  },
  {
    id: "5",
    title: "Set up Vitest and Playwright test harnesses",
    priority: "medium",
    status: "completed",
    due: "Yesterday",
    category: "Testing",
  },
]

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <CheckSquare className="size-3.5" />
            <span>Task Manager</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tasks
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            4 active · 1 completed · Private Single-User
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
            <ArrowUpDown className="size-3.5" />
            <span>Sort</span>
          </Button>
          <Button size="sm" className="gap-1.5 font-mono text-xs">
            <Plus className="size-3.5" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-2 overflow-x-auto text-xs font-mono">
        <button
          type="button"
          className="px-3 py-1.5 rounded-md bg-foreground text-background font-semibold"
        >
          All (5)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Today (2)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Upcoming (2)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Completed (1)
        </button>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2">
        {SAMPLE_TASKS.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label={`Mark "${task.title}" as ${task.status === "completed" ? "incomplete" : "complete"}`}
                className="size-5 rounded-md border border-border hover:border-foreground flex items-center justify-center transition-colors shrink-0"
              >
                {task.status === "completed" && (
                  <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/20" />
                )}
              </button>

              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-medium truncate ${
                    task.status === "completed"
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                  <span>{task.category}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-2.5" />
                    <span>{task.due}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={
                  task.priority === "high"
                    ? "destructive"
                    : task.priority === "medium"
                    ? "secondary"
                    : "outline"
                }
                className="text-[10px] uppercase font-mono px-2 py-0 h-5"
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Footer shortcut hint */}
      <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-center text-xs font-mono text-muted-foreground">
        Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">⌘N</kbd> anywhere to create a task via command palette.
      </div>
    </div>
  )
}
