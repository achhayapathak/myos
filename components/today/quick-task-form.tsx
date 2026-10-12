"use client"

import * as React from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { createQuickTask } from "@/app/(app)/today/actions"
import type { TaskPriority } from "@/types/database"
import { cn } from "@/lib/utils"

function getLocalDateStr(date: Date, timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date) // "YYYY-MM-DD"
}

const emptySubscribe = () => () => {}

function checkIsMac(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  const nav = navigator as { userAgentData?: { platform?: string }; platform?: string; userAgent?: string }
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || ""
  return /mac|iphone|ipad|ipod/i.test(platform)
}

export function QuickTaskForm() {
  const [title, setTitle] = React.useState("")
  const [priority, setPriority] = React.useState<TaskPriority>("medium")
  
  // Date state
  const todayStr = React.useMemo(() => getLocalDateStr(new Date()), [])
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr)

  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const isMac = React.useSyncExternalStore(emptySubscribe, checkIsMac, () => false)

  // Focus helper for typing mode
  const focusInput = React.useCallback(() => {
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      inputRef.current.focus()
    }
  }, [])

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modal dialog is open or event was handled
      if (document.querySelector('[role="dialog"]') || e.defaultPrevented) return

      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      const isKeyT = e.code === "KeyT" || e.key.toLowerCase() === "t"

      // Supported shortcuts:
      // 1. Ctrl + T (both Mac Control and Windows Ctrl)
      // 2. Alt + T (Option + T on Mac, Alt + T on Windows)
      // 3. Single key 't' when not typing in any input field
      const isCtrlT = e.ctrlKey && isKeyT
      const isAltT = e.altKey && isKeyT
      const isSingleT = !isInput && !e.ctrlKey && !e.metaKey && !e.altKey && isKeyT

      if (isCtrlT || isAltT || isSingleT) {
        e.preventDefault()
        focusInput()
      }
    }

    const handleFocusEvent = () => {
      focusInput()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("myos:focus-quick-task", handleFocusEvent)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("myos:focus-quick-task", handleFocusEvent)
    }
  }, [focusInput])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || isPending) return

    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append("title", title.trim())
    formData.append("priority", priority)
    if (selectedDate) {
      formData.append("dueDate", selectedDate)
      if (selectedDate === todayStr) {
        formData.append("dueToday", "true")
      }
    }

    startTransition(async () => {
      const res = await createQuickTask(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setTitle("")
        setSelectedDate(todayStr)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        inputRef.current?.focus()
      }
    })
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      inputRef.current?.blur()
    }
  }

  return (
    <div
      id="quick-task"
      className={cn(
        "rounded-xl border bg-card p-4 shadow-xs transition-all duration-200",
        isFocused
          ? "border-primary/60 ring-2 ring-primary/20 shadow-md"
          : "border-border/70"
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              htmlFor="quick-task-input"
              className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span>Quick Task</span>
            </label>
            <button
              type="button"
              onClick={focusInput}
              aria-label={`Focus quick task input (Shortcut: ${isMac ? "ctl + t" : "Ctrl + T"} or T)`}
              title={`Focus Quick Task (${isMac ? "ctl + t (⌃T)" : "Ctrl+T"}, Alt+T, or press T)`}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border transition-all cursor-pointer touch-manipulation",
                isFocused
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <kbd className="font-semibold">{isMac ? "ctl + t" : "Ctrl+T"}</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isFocused && (
              <span className="text-[10px] font-mono text-primary flex items-center gap-1 animate-in fade-in">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="hidden sm:inline">Typing mode</span>
                <kbd className="px-1 py-0.2 rounded bg-muted/60 text-[9px] border border-border/50">Esc</kbd>
              </span>
            )}
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
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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

            {/* Due date calendar picker popover */}
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              disabled={isPending}
              variant="chip"
              align="end"
            />

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
