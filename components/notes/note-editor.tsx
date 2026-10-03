"use client"

import * as React from "react"
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  FileEdit,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Note } from "@/types/database"
import { MarkdownPreview } from "@/lib/notes/markdown"
import { getNoteStats } from "@/lib/notes/utils"
import { cn } from "@/lib/utils"

interface NoteEditorProps {
  note: Note | null
  onUpdate: (updated: { id: string; title: string; content: string }) => Promise<boolean>
  onDelete: (noteId: string) => void
  onBackToList?: () => void
  showBackButton?: boolean
}

type SaveState = "saved" | "unsaved" | "saving" | "error"

export function NoteEditor({
  note,
  onUpdate,
  onDelete,
  onBackToList,
  showBackButton = false,
}: NoteEditorProps) {
  // If no note is selected
  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-background h-full">
        <FileEdit className="size-10 text-muted-foreground/30 mb-2" />
        <h3 className="text-sm font-semibold text-foreground">No note selected</h3>
        <p className="text-xs font-mono text-muted-foreground mt-1 max-w-xs">
          Select a note from the list on the left, or create a new note to start writing.
        </p>
      </div>
    )
  }

  return (
    <NoteEditorInner
      key={note.id}
      note={note}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onBackToList={onBackToList}
      showBackButton={showBackButton}
    />
  )
}

function NoteEditorInner({
  note,
  onUpdate,
  onDelete,
  onBackToList,
  showBackButton = false,
}: {
  note: Note
  onUpdate: (updated: { id: string; title: string; content: string }) => Promise<boolean>
  onDelete: (noteId: string) => void
  onBackToList?: () => void
  showBackButton?: boolean
}) {
  const [title, setTitle] = React.useState(note.title)
  const [content, setContent] = React.useState(note.content || "")
  const [viewMode, setViewMode] = React.useState<"edit" | "preview">("edit")
  const [saveState, setSaveState] = React.useState<SaveState>("saved")
  const [lastSavedTime, setLastSavedTime] = React.useState<string | null>(null)

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Perform actual save
  const performSave = React.useCallback(
    async (titleToSave: string, contentToSave: string) => {
      setSaveState("saving")
      try {
        const success = await onUpdate({
          id: note.id,
          title: titleToSave.trim() || "Untitled Note",
          content: contentToSave,
        })

        if (success) {
          setSaveState("saved")
          const now = new Date()
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          setLastSavedTime(timeStr)
        } else {
          setSaveState("error")
        }
      } catch {
        setSaveState("error")
      }
    },
    [note.id, onUpdate]
  )

  // Trigger debounced autosave
  const triggerAutosave = React.useCallback(
    (newTitle: string, newContent: string) => {
      setSaveState("unsaved")

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        performSave(newTitle, newContent)
      }, 750) // 750ms debounce
    },
    [performSave]
  )

  // Clean up debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Immediate save with Cmd+S / Ctrl+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      performSave(title, content)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    triggerAutosave(newTitle, content)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    triggerAutosave(title, newContent)
  }

  const { words, chars } = getNoteStats(content)

  return (
    <div
      onKeyDown={handleKeyDown}
      className="flex-1 flex flex-col h-full bg-background overflow-hidden"
    >
      {/* Top Action Bar */}
      <div className="p-2 sm:p-3 border-b border-border/50 flex items-center justify-between gap-2 sm:gap-3 shrink-0 bg-muted/10">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          {/* Mobile Back Button */}
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToList}
              className="md:hidden h-8 px-2 font-mono text-xs gap-1 cursor-pointer shrink-0 touch-manipulation min-h-[36px]"
              aria-label="Back to notes list"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden xs:inline">Notes</span>
            </Button>
          )}

          {/* Editable Note Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="text-base sm:text-lg font-bold tracking-tight bg-transparent border-none outline-hidden text-foreground w-full placeholder:text-muted-foreground/50 truncate"
          />
        </div>

        {/* Right Toolbar: Autosave status, View Mode toggle, Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
            {saveState === "saving" && (
              <span className="flex items-center gap-1 text-primary">
                <Loader2 className="size-3 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-emerald-500">
                <Check className="size-3" />
                <span className="hidden sm:inline">Saved</span>
              </span>
            )}
            {saveState === "unsaved" && (
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="size-3" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="size-3" />
                <span className="hidden sm:inline">Save error</span>
              </span>
            )}
          </div>

          {/* Write / Preview Tab Pill */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-md text-xs font-mono transition-all cursor-pointer select-none touch-manipulation",
                viewMode === "edit"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileEdit className="size-3" />
              <span>Write</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-md text-xs font-mono transition-all cursor-pointer select-none touch-manipulation",
                viewMode === "preview"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Delete Note Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(note.id)}
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer touch-manipulation"
            title="Delete this note"
            aria-label="Delete note"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Body: Markdown Textarea or Safe Preview */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        {viewMode === "edit" ? (
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing markdown... Use # for headings, - for lists, `code`, **bold**, or links."
            className="w-full h-full min-h-[350px] resize-none bg-transparent border-none outline-hidden font-mono text-base sm:text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 selection:bg-primary/20"
            autoFocus
          />
        ) : (
          <div className="max-w-3xl mx-auto py-2">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="p-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <span>{words} words</span>
          <span>•</span>
          <span>{chars} characters</span>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime ? (
            <span>Last saved at {lastSavedTime}</span>
          ) : (
            <span>Auto-saving enabled</span>
          )}
          <span className="hidden sm:inline-block opacity-60">
            (<kbd className="px-1 py-0.2 rounded bg-muted border border-border">⌘S</kbd> to save now)
          </span>
        </div>
      </div>
    </div>
  )
}
