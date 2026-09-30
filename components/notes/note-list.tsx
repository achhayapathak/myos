"use client"

import * as React from "react"
import { Search, Plus, Trash2, FileText, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Note } from "@/types/database"
import { formatNoteUpdatedTime, getNoteSnippet } from "@/lib/notes/utils"
import { cn } from "@/lib/utils"

interface NoteListProps {
  notes: Note[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  onCreateNote: () => void
  onDeleteNote: (noteId: string, e: React.MouseEvent) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  className?: string
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  onSearchChange,
  className,
}: NoteListProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-r border-border/60 overflow-hidden",
        className
      )}
    >
      {/* Top Header: Search & New Note */}
      <div className="p-3 border-b border-border/50 flex flex-col gap-2 shrink-0 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground tracking-tight">
            <FileText className="size-3.5 text-primary" />
            <span>Notes</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({notes.length})
            </span>
          </div>

          <Button
            size="sm"
            onClick={onCreateNote}
            className="h-7 text-xs font-mono gap-1 px-2.5 cursor-pointer shadow-xs"
            title="Create new note"
          >
            <Plus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes..."
            className="h-7 pl-8 pr-7 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Note List Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length > 0 ? (
          notes.map((note) => {
            const isSelected = note.id === selectedNoteId
            const updatedLabel = formatNoteUpdatedTime(note.updated_at)
            const snippet = getNoteSnippet(note.content)

            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectNote(note.id)
                  }
                }}
                className={cn(
                  "group relative flex flex-col p-2.5 rounded-lg text-left transition-all cursor-pointer border select-none",
                  isSelected
                    ? "bg-accent text-accent-foreground border-accent-foreground/20 shadow-xs"
                    : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium truncate flex-1",
                      isSelected ? "text-foreground font-semibold" : "text-foreground/90"
                    )}
                  >
                    {note.title || "Untitled Note"}
                  </span>

                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {updatedLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-mono text-muted-foreground/80 line-clamp-2 leading-relaxed flex-1">
                    {snippet}
                  </p>

                  <button
                    type="button"
                    onClick={(e) => onDeleteNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0 cursor-pointer"
                    aria-label={`Delete note "${note.title}"`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-xs font-mono text-muted-foreground">
              {searchQuery ? "No notes found" : "No notes yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateNote}
                className="text-xs font-mono mt-1 cursor-pointer"
              >
                <Plus className="size-3 mr-1" />
                <span>Create a note</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between bg-muted/10 shrink-0">
        <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
        <span className="opacity-70">Debounced autosave</span>
      </div>
    </div>
  )
}
