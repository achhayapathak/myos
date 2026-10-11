"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, ArrowRight, Loader2, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createQuickNote } from "@/app/(app)/today/actions"
import { cn } from "@/lib/utils"

const emptySubscribe = () => () => {}

function checkIsMac(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  const nav = navigator as { userAgentData?: { platform?: string }; platform?: string; userAgent?: string }
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || ""
  return /mac|iphone|ipad|ipod/i.test(platform)
}

export function QuickNoteForm() {
  const [content, setContent] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const isMac = React.useSyncExternalStore(emptySubscribe, checkIsMac, () => false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Focus helper for typing mode
  const focusTextarea = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      textareaRef.current.focus()
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

      const isKeyN = e.code === "KeyN" || e.key.toLowerCase() === "n"

      // Supported shortcuts:
      // 1. Ctrl + N (both Mac Control and Windows Ctrl)
      // 2. Alt + N (Option + N on Mac, Alt + N on Windows)
      // 3. Single key 'n' when not typing in any input field
      const isCtrlN = e.ctrlKey && isKeyN
      const isAltN = e.altKey && isKeyN
      const isSingleN = !isInput && !e.ctrlKey && !e.metaKey && !e.altKey && isKeyN

      if (isCtrlN || isAltN || isSingleN) {
        e.preventDefault()
        focusTextarea()
      }
    }

    const handleFocusEvent = () => {
      focusTextarea()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("myos:focus-quick-note", handleFocusEvent)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("myos:focus-quick-note", handleFocusEvent)
    }
  }, [focusTextarea])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim() || isPending) return

    setError(null)
    setSaved(false)

    const formData = new FormData()
    formData.append("content", content.trim())

    startTransition(async () => {
      const res = await createQuickNote(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setContent("")
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        textareaRef.current?.focus()
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Esc to blur / exit typing mode
    if (e.key === "Escape") {
      e.preventDefault()
      textareaRef.current?.blur()
      return
    }

    // Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <div
      id="quick-note"
      className={cn(
        "rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between transition-all duration-200",
        isFocused
          ? "border-primary/60 ring-2 ring-primary/20 shadow-md"
          : "border-border/70"
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <label
              htmlFor="quick-note-textarea"
              className="flex items-center gap-2 cursor-pointer"
            >
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                Quick Note & Scratchpad
              </h2>
            </label>
            <button
              type="button"
              onClick={focusTextarea}
              aria-label={`Focus quick note textarea (Shortcut: ${isMac ? "ctl + n" : "Ctrl + N"} or N)`}
              title={`Focus Quick Note (${isMac ? "ctl + n (⌃N)" : "Ctrl+N"}, Alt+N, or press N)`}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border transition-all cursor-pointer touch-manipulation",
                isFocused
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <kbd className="font-semibold">{isMac ? "ctl + n" : "Ctrl+N"}</kbd>
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
            <span className="text-[10px] font-mono text-muted-foreground">
              Markdown ready
            </span>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="quick-note-textarea"
            ref={textareaRef}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isPending}
            placeholder={`Jot down quick thoughts, scratchpad ideas, meeting takeaways... (${isMac ? "⌘" : "Ctrl"}+Enter to save)`}
            className="w-full resize-none rounded-lg border border-border/60 bg-muted/20 p-3 text-base sm:text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            required
          />
        </div>

        {error && (
          <p className="text-[11px] font-mono text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !content.trim()}
              className="gap-1.5 font-mono text-xs h-8 sm:h-7.5 min-h-[36px] px-3.5 cursor-pointer touch-manipulation"
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : saved ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <FileText className="size-3" />
              )}
              <span>{saved ? "Saved!" : "Save Note"}</span>
            </Button>

            {saved && (
              <span className="text-[11px] font-mono text-emerald-500 animate-in fade-in">
                Saved to notes archive
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:flex items-center gap-1">
            <Clock className="size-3" />
            <span>Instant capture</span>
          </span>
        </div>
      </form>

      <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Press {isMac ? "⌘" : "Ctrl"}+Enter to submit
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
  )
}
