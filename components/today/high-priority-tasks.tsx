import Link from "next/link"
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/types/database"
import { TaskItem } from "./task-item"

interface HighPriorityTasksProps {
  tasks: Task[]
  startISO: string
  endISO: string
  timeZone?: string
}

export function HighPriorityTasks({
  tasks,
  startISO,
  endISO,
  timeZone,
}: HighPriorityTasksProps) {
  const pendingCount = tasks.filter((t) => t.status !== "completed").length

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              High-Priority Tasks
            </h2>
          </div>
          <Badge
            variant={pendingCount > 0 ? "destructive" : "secondary"}
            className="text-[11px] font-mono h-5 px-2"
          >
            {pendingCount} active
          </Badge>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-lg border border-dashed border-border/60 bg-muted/10">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              No high-priority tasks
            </p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 max-w-[240px]">
              All critical items have been handled.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                startISO={startISO}
                endISO={endISO}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
        <Link
          href="/tasks"
          className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <span>Manage tasks</span>
          <ArrowRight className="size-3" />
        </Link>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Prioritized by deadline
        </span>
      </div>
    </div>
  )
}
