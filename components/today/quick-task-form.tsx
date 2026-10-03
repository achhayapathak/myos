"use client"

import * as React from "react"
import { Plus, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createQuickTask } from "@/app/(app)/today/actions"
import type { TaskPriority } from "@/types/database"
import { cn } from "@/lib/utils"

export function QuickTaskForm() {
  const [title, setTitle] = React.useState("")
  const [priority, setPriority] = React.useState<TaskPriority>("medium")
  const [dueToday, setDueToday] = React.useState(true)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || isPending) return

    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append("title", title.trim())
    formData.append("priority", priority)
    if (dueToday) {
      formData.append("dueToday", "true")
    }

    startTransition(async () => {
      const res = await createQuickTask(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setTitle("")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        inputRef.current?.focus()
      }
    })
  }

  return (
    <div
      id="quick-task"
      className="rounded-xl border border-border/70 bg-card p-4 shadow-xs"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="quick-task-input"
            className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5"
          >
            <Plus className="size-3.5 text-muted-foreground" />
            <span>Quick Task</span>
          </label>
          <div className="flex items-center gap-1.5">
            {success && (
              <span className="text-[11px] font-mono text-emerald-500 animate-in fade-in">
                Added!
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">
              Press Enter to add
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="quick-task-input"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done? (e.g. Deploy release, update docs...)"
            disabled={isPending}
            className="flex-1 text-base sm:text-xs font-sans h-9 sm:h-8.5 bg-muted/20"
            autoComplete="off"
            required
          />

          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
            {/* Priority Selector */}
            <div
              role="radiogroup"
              aria-label="Task priority"
              className="flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5 text-[11px] font-mono shrink-0"
            >
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={priority === p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-2.5 py-1 min-h-[30px] rounded capitalize transition-all cursor-pointer touch-manipulation",
                    priority === p
                      ? p === "high"
                        ? "bg-destructive text-destructive-foreground font-semibold"
                        : "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Due today toggle */}
            <button
              type="button"
              onClick={() => setDueToday(!dueToday)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 h-8 sm:h-7.5 rounded-lg border text-[11px] font-mono transition-colors shrink-0 cursor-pointer touch-manipulation",
                dueToday
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
              )}
              title={dueToday ? "Due Today is enabled" : "No due date set"}
            >
              <Calendar className="size-3" />
              <span>Today</span>
            </button>

            <Button
              type="submit"
              size="sm"
              disabled={isPending || !title.trim()}
              className="font-mono text-xs gap-1.5 h-8 sm:h-7.5 px-3 shrink-0 cursor-pointer touch-manipulation"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>Add</span>
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-[11px] font-mono text-destructive">{error}</p>
        )}
      </form>
    </div>
  )
}
