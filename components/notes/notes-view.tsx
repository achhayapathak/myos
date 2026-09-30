"use client"

import * as React from "react"
import type { Note } from "@/types/database"
import { createNote, updateNote, deleteNote } from "@/app/(app)/notes/actions"
import { filterNotes } from "@/lib/notes/utils"
import { NoteList } from "./note-list"
import { NoteEditor } from "./note-editor"
import { AlertCircle, X } from "lucide-react"

interface NotesViewProps {
  initialNotes: Note[]
  user: {
    id: string
    displayName: string | null
    email: string | null
  }
}

export function NotesView({ initialNotes }: NotesViewProps) {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes)
  const [prevInitialNotes, setPrevInitialNotes] = React.useState(initialNotes)

  // Sync state if server passes updated initialNotes
  if (prevInitialNotes !== initialNotes) {
    setPrevInitialNotes(initialNotes)
    setNotes(initialNotes)
  }

  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(
    initialNotes[0]?.id || null
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const [mobileView, setMobileView] = React.useState<"list" | "editor">("list")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const filteredNotes = React.useMemo(() => {
    return filterNotes(notes, searchQuery)
  }, [notes, searchQuery])

  const selectedNote = React.useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null
  }, [notes, selectedNoteId])

  // Create Note
  const handleCreateNote = async () => {
    setErrorMessage(null)
    try {
      const res = await createNote({
        title: "Untitled Note",
        content: "",
      })

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to create note.")
        return
      }

      const newNote = res.data
      setNotes((prev) => [newNote, ...prev])
      setSelectedNoteId(newNote.id)
      setMobileView("editor")
    } catch {
      setErrorMessage("Network error while creating note.")
    }
  }

  // Update Note (called by debounced autosave in editor)
  const handleUpdateNote = async (updated: {
    id: string
    title: string
    content: string
  }): Promise<boolean> => {
    try {
      const res = await updateNote(updated)
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to save note.")
        return false
      }

      const savedNote = res.data
      setNotes((prev) => {
        const others = prev.filter((n) => n.id !== savedNote.id)
        // Bring most recently updated note to the top
        return [savedNote, ...others]
      })
      return true
    } catch {
      setErrorMessage("Network error during autosave.")
      return false
    }
  }

  // Delete Note
  const handleDeleteNote = async (noteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setErrorMessage(null)

    // Store rollback
    const previousNotes = [...notes]
    const remainingNotes = notes.filter((n) => n.id !== noteId)
    setNotes(remainingNotes)

    if (selectedNoteId === noteId) {
      const nextSelected = remainingNotes[0]?.id || null
      setSelectedNoteId(nextSelected)
      setMobileView("list")
    }

    try {
      const res = await deleteNote(noteId)
      if (!res.success) {
        setNotes(previousNotes)
        setErrorMessage(res.error || "Failed to delete note.")
      }
    } catch {
      setNotes(previousNotes)
      setErrorMessage("Network error while deleting note.")
    }
  }

  // Select note handler
  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId)
    setMobileView("editor")
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-8.5rem)] max-w-6xl mx-auto w-full pb-4">
      {/* Error alert banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 p-2.5 text-xs rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-mono animate-in fade-in-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Main Split-View / Responsive Container */}
      <div className="flex-1 flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        {/* Left Column: Notes List */}
        <div
          className={`w-full md:w-80 md:flex flex-col shrink-0 ${
            mobileView === "list" ? "flex" : "hidden md:flex"
          }`}
        >
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right Column: Note Editor */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            mobileView === "editor" ? "flex" : "hidden md:flex"
          }`}
        >
          <NoteEditor
            note={selectedNote}
            onUpdate={handleUpdateNote}
            onDelete={(id) => handleDeleteNote(id)}
            onBackToList={() => setMobileView("list")}
            showBackButton={true}
          />
        </div>
      </div>
    </div>
  )
}
