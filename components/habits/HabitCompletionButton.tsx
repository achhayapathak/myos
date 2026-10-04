"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleHabitCompletion } from "@/app/(app)/habits/actions"

export interface HabitCompletionButtonProps {
  habitId: string
  habitName: string
  completedOn: string
  isCompleted: boolean
  onToggle?: (nextCompleted: boolean) => void
  disabled?: boolean
  className?: string
}

export function HabitCompletionButton({
  habitId,
  habitName,
  completedOn,
  isCompleted: initialCompleted,
  onToggle,
  disabled = false,
  className,
}: HabitCompletionButtonProps) {
  const [completed, setCompleted] = React.useState(initialCompleted)
  const [prevInitial, setPrevInitial] = React.useState(initialCompleted)
  const [isPending, startTransition] = React.useTransition()

  if (prevInitial !== initialCompleted) {
    setPrevInitial(initialCompleted)
    setCompleted(initialCompleted)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || isPending) return

    const nextCompleted = !completed
    // Optimistic update
    setCompleted(nextCompleted)
    onToggle?.(nextCompleted)

    startTransition(async () => {
      const res = await toggleHabitCompletion(habitId, completedOn, nextCompleted)
      if (!res.success) {
        // Rollback on failure
        setCompleted(initialCompleted)
        onToggle?.(initialCompleted)
      }
    })
  }

  const label = completed
    ? `Mark ${habitName} as incomplete`
    : `Mark ${habitName} as complete`

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={label}
      disabled={disabled || isPending}
      onClick={handleClick}
      className={cn(
        // Generous 44px minimum touch target for mobile-first thumb reach
        "relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-transform active:scale-95 touch-manipulation cursor-pointer",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div
        className={cn(
          "size-6.5 rounded-full flex items-center justify-center transition-all duration-200 border-2 select-none shadow-2xs",
          completed
            ? "bg-foreground text-background border-foreground font-bold"
            : "border-muted-foreground/40 bg-background/50 hover:border-foreground/80 hover:bg-muted/40"
        )}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin text-current" />
        ) : completed ? (
          <Check className="size-4 stroke-[3]" />
        ) : (
          <span className="size-2 rounded-full bg-transparent group-hover:bg-muted-foreground/30 transition-colors" />
        )}
      </div>
    </button>
  )
}
