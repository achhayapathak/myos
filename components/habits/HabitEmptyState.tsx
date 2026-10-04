"use client"

import * as React from "react"
import { Plus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HabitEmptyStateProps {
  onCreateHabit: () => void
  className?: string
}

export function HabitEmptyState({
  onCreateHabit,
  className,
}: HabitEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 select-none",
        className
      )}
    >
      <div className="size-12 rounded-2xl bg-foreground/5 border border-border/60 flex items-center justify-center mb-4 text-foreground/70">
        <CheckCircle2 className="size-6 stroke-[1.75]" />
      </div>

      <p className="text-sm font-medium text-foreground max-w-sm mb-5 leading-normal">
        Build a few habits that make your days better.
      </p>

      <Button
        type="button"
        onClick={onCreateHabit}
        className="gap-2 shadow-xs cursor-pointer font-medium"
      >
        <Plus className="size-4" />
        <span>Create your first habit</span>
      </Button>
    </div>
  )
}
