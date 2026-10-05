"use client"

import * as React from "react"
import type { Note } from "@/types/database"
import {
  createNote,
  updateNote,
  deleteNote,
  lockNote,
  unlockNote,
  removeNoteLock,
} from "@/app/(app)/notes/actions"
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

  // Track session-unlocked notes: noteId -> { content, password }
  const [unlockedNotes, setUnlockedNotes] = React.useState<
    Record<string, { content: string; password: string }>
  >({})

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
  const handleCreateNote = React.useCallback(async () => {
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
  }, [])

  // Command palette and deep link listener for note creation & selection
  React.useEffect(() => {
    const handleCreateEvent = () => {
      void handleCreateNote()
    }

    const handleSelectNoteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ noteId: string }>
      const noteId = customEvent.detail?.noteId
      if (noteId) {
        setSelectedNoteId(noteId)
        setMobileView("editor")
      }
    }

    window.addEventListener("myos:create-note", handleCreateEvent)
    window.addEventListener("myos:select-note", handleSelectNoteEvent)

    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (params.get("new") === "true" || params.get("create") === "true") {
          void handleCreateNote()
          window.history.replaceState({}, "", window.location.pathname)
        } else {
          const noteId = params.get("noteId")
          if (noteId) {
            setSelectedNoteId(noteId)
            setMobileView("editor")
            window.history.replaceState({}, "", window.location.pathname)
          }
        }
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("myos:create-note", handleCreateEvent)
      window.removeEventListener("myos:select-note", handleSelectNoteEvent)
    }
  }, [handleCreateNote])

  // Unlock Note
  const handleUnlockNote = async (noteId: string, password: string): Promise<boolean> => {
    setErrorMessage(null)
    try {
      const res = await unlockNote({ id: noteId, password })
      if (!res.success || !res.data) {
        return false
      }

      const content = res.data.content
      setUnlockedNotes((prev) => ({
        ...prev,
        [noteId]: { content, password },
      }))
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, content } : n))
      )
      return true
    } catch {
      setErrorMessage("Network error while unlocking note.")
      return false
    }
  }

  // Lock Note
  const handleLockNote = async (noteId: string, password: string): Promise<boolean> => {
    setErrorMessage(null)
    try {
      const res = await lockNote({ id: noteId, password })
      if (!res.success) {
        setErrorMessage(res.error || "Failed to lock note.")
        return false
      }

      const note = notes.find((n) => n.id === noteId)
      const currentContent = note?.content || ""

      setUnlockedNotes((prev) => ({
        ...prev,
        [noteId]: { content: currentContent, password },
      }))
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, is_locked: true } : n))
      )
      return true
    } catch {
      setErrorMessage("Network error while locking note.")
      return false
    }
  }

  // Remove Lock
  const handleRemoveLock = async (noteId: string, password: string): Promise<boolean> => {
    setErrorMessage(null)
    try {
      const res = await removeNoteLock({ id: noteId, password })
      if (!res.success) {
        setErrorMessage(res.error || "Failed to remove lock.")
        return false
      }

      setUnlockedNotes((prev) => {
        const copy = { ...prev }
        delete copy[noteId]
        return copy
      })
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, is_locked: false } : n))
      )
      return true
    } catch {
      setErrorMessage("Network error while removing lock.")
      return false
    }
  }

  // Relock note immediately
  const handleRelockNote = (noteId: string) => {
    setUnlockedNotes((prev) => {
      const copy = { ...prev }
      delete copy[noteId]
      return copy
    })
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: "" } : n))
    )
  }

  // Update Note (called by debounced autosave in editor)
  const handleUpdateNote = async (updated: {
    id: string
    title: string
    content: string
    password?: string
  }): Promise<boolean> => {
    try {
      const pwd = updated.password || unlockedNotes[updated.id]?.password
      const res = await updateNote({
        ...updated,
        password: pwd,
      })
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to save note.")
        return false
      }

      const savedNote = res.data
      setNotes((prev) => {
        const others = prev.filter((n) => n.id !== savedNote.id)
        // Bring most recently updated note to the top while preserving content
        return [{ ...savedNote, content: updated.content }, ...others]
      })

      if (unlockedNotes[updated.id]) {
        setUnlockedNotes((prev) => ({
          ...prev,
          [updated.id]: { content: updated.content, password: pwd || "" },
        }))
      }

      return true
    } catch {
      setErrorMessage("Network error during autosave.")
      return false
    }
  }

  // Delete Note
  const handleDeleteNote = async (
    noteId: string,
    password?: string,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation()
    }
    setErrorMessage(null)

    const pwd = password || unlockedNotes[noteId]?.password

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
      const res = await deleteNote(noteId, pwd)
      if (!res.success) {
        setNotes(previousNotes)
        setErrorMessage(res.error || "Failed to delete note.")
      } else {
        setUnlockedNotes((prev) => {
          const copy = { ...prev }
          delete copy[noteId]
          return copy
        })
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

  const isSelectedUnlocked = selectedNote ? Boolean(unlockedNotes[selectedNote.id]) : false
  const currentPassword = selectedNote ? unlockedNotes[selectedNote.id]?.password : ""

  return (
    <div className="flex flex-col gap-3 h-[calc(100dvh-8.5rem)] max-w-6xl mx-auto w-full pb-2 md:pb-4">
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
            className="hover:opacity-75 cursor-pointer touch-manipulation"
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
          className={`w-full md:w-64 lg:w-80 md:flex flex-col shrink-0 ${
            mobileView === "list" ? "flex" : "hidden md:flex"
          }`}
        >
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            unlockedNoteIds={Object.keys(unlockedNotes)}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={(id, e) => handleDeleteNote(id, undefined, e)}
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
            isUnlocked={isSelectedUnlocked}
            unlockedPassword={currentPassword}
            onUpdate={handleUpdateNote}
            onDelete={(id, pwd) => handleDeleteNote(id, pwd)}
            onLock={handleLockNote}
            onUnlock={handleUnlockNote}
            onRemoveLock={handleRemoveLock}
            onRelock={handleRelockNote}
            onBackToList={() => setMobileView("list")}
            showBackButton={true}
          />
        </div>
      </div>
    </div>
  )
}
