"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, ArrowRight, Loader2, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createQuickNote } from "@/app/(app)/today/actions"

export function QuickNoteForm() {
  const [content, setContent] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
              Quick Note & Scratchpad
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            Markdown ready
          </span>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder="Jot down quick thoughts, scratchpad ideas, meeting takeaways... (⌘+Enter to save)"
            className="w-full resize-none rounded-lg border border-border/60 bg-muted/20 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
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
              className="gap-1.5 font-mono text-xs h-7 cursor-pointer"
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
          Press ⌘+Enter to submit
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
