import Link from "next/link"
import { CheckSquare, ArrowRight, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/types/database"
import { TaskItem } from "./task-item"

interface TasksDueTodayProps {
  tasks: Task[]
  startISO: string
  endISO: string
  timeZone?: string
}

export function TasksDueToday({
  tasks,
  startISO,
  endISO,
  timeZone,
}: TasksDueTodayProps) {
  const pendingTasks = tasks.filter((t) => t.status !== "completed")

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              Today&apos;s Tasks
            </h2>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono h-5 px-2">
            {pendingTasks.length} pending
          </Badge>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-lg border border-dashed border-border/60 bg-muted/10">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2.5">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-foreground">All clear for today</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 max-w-[240px]">
              No tasks due today. Add a new task or enjoy your open day.
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
          <span>View all tasks</span>
          <ArrowRight className="size-3" />
        </Link>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Press ⌥2 to jump
        </span>
      </div>
    </div>
  )
}
