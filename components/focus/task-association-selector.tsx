"use client"

import * as React from "react"
import { CheckSquare, ChevronDown, X, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Task } from "@/types/database"
import { PRIORITY_CONFIG } from "@/lib/tasks/utils"
import { cn } from "@/lib/utils"

interface TaskAssociationSelectorProps {
  availableTasks: Pick<Task, "id" | "title" | "priority" | "status">[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string | null) => void
  disabled?: boolean
}

export function TaskAssociationSelector({
  availableTasks,
  selectedTaskId,
  onSelectTask,
  disabled = false,
}: TaskAssociationSelectorProps) {
  const selectedTask = availableTasks.find((t) => t.id === selectedTaskId)

  return (
    <div className="flex items-center gap-2 max-w-md w-full justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 min-h-[38px] rounded-xl border border-border/60 bg-muted/30 text-xs font-mono transition-all text-left max-w-full truncate cursor-pointer touch-manipulation",
                disabled && "opacity-60 cursor-not-allowed",
                selectedTask ? "border-primary/40 bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            />
          }
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <CheckSquare className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedTask ? selectedTask.title : "Link a task to this session (optional)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {selectedTask && (
              <Badge
                variant={PRIORITY_CONFIG[selectedTask.priority]?.badgeVariant || "outline"}
                className="text-[9px] uppercase font-mono px-1 py-0 h-4"
              >
                {selectedTask.priority}
              </Badge>
            )}
            <ChevronDown className="size-3 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="w-[calc(100vw-2rem)] sm:w-80 max-h-64 overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-mono">
            Select Active Task
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => onSelectTask(null)} className="text-xs font-mono">
            {selectedTaskId === null && <Check className="size-3 mr-1.5 text-primary" />}
            <span className="text-muted-foreground">None (General Focus)</span>
          </DropdownMenuItem>

          {availableTasks.length > 0 ? (
            availableTasks.map((task) => {
              const isSelected = task.id === selectedTaskId
              return (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="flex items-center justify-between text-xs font-mono gap-2"
                >
                  <div className="flex items-center gap-1.5 truncate flex-1">
                    {isSelected && <Check className="size-3 text-primary shrink-0" />}
                    <span className="truncate">{task.title}</span>
                  </div>
                  <Badge
                    variant={PRIORITY_CONFIG[task.priority]?.badgeVariant || "outline"}
                    className="text-[9px] uppercase font-mono px-1 py-0 h-4 shrink-0"
                  >
                    {task.priority}
                  </Badge>
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="p-2 text-xs font-mono text-muted-foreground text-center">
              No active tasks available.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedTaskId && !disabled && (
        <button
          type="button"
          onClick={() => onSelectTask(null)}
          className="size-6 flex items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          title="Clear task association"
          aria-label="Clear task association"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}
