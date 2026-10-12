"use client"

import * as React from "react"
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  EyeOff,
  FileEdit,
  Loader2,
  Trash2,
  AlertCircle,
  Lock,
  LockOpen,
  KeyRound,
  Link as LinkIcon,
  Globe,
  Copy,
  Link2Off,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Note } from "@/types/database"
import { MarkdownPreview } from "@/lib/notes/markdown"
import { getNoteStats } from "@/lib/notes/utils"
import { cn } from "@/lib/utils"
import { EditorToolbar, type ToolbarActionType } from "./editor-toolbar"
import {
  toggleInlineFormat,
  toggleUnderline,
  toggleHeading,
  toggleList,
  toggleBlockquote,
  toggleCodeBlock,
  insertLink,
  insertHorizontalRule,
  insertTable,
  clearFormatting,
  indentLines,
  detectActiveFormats,
  type ActiveFormats,
} from "@/lib/notes/editor-actions"

interface NoteEditorProps {
  note: Note | null
  isUnlocked?: boolean
  unlockedPassword?: string
  onUpdate: (updated: {
    id: string
    title: string
    content: string
    password?: string
  }) => Promise<boolean>
  onDelete: (
    noteId: string,
    password?: string
  ) => Promise<boolean | void> | void
  onLock?: (noteId: string, password: string) => Promise<boolean>
  onUnlock?: (noteId: string, password: string) => Promise<boolean>
  onRemoveLock?: (noteId: string, password: string) => Promise<boolean>
  onRelock?: (noteId: string) => void
  onShare?: (noteId: string) => Promise<{ shareToken: string } | null>
  onUnshare?: (noteId: string) => Promise<boolean>
  onBackToList?: () => void
  showBackButton?: boolean
}

type SaveState = "saved" | "unsaved" | "saving" | "error"

export function NoteEditor({
  note,
  isUnlocked = false,
  unlockedPassword = "",
  onUpdate,
  onDelete,
  onLock,
  onUnlock,
  onRemoveLock,
  onRelock,
  onShare,
  onUnshare,
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

  // If note is locked and hasn't been unlocked in this session
  if (note.is_locked && !isUnlocked) {
    return (
      <LockedNotePrompt
        note={note}
        onUnlock={onUnlock}
        onDelete={onDelete}
        onBackToList={onBackToList}
        showBackButton={showBackButton}
      />
    )
  }

  return (
    <NoteEditorInner
      key={note.id}
      note={note}
      unlockedPassword={unlockedPassword}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onLock={onLock}
      onRemoveLock={onRemoveLock}
      onRelock={onRelock}
      onShare={onShare}
      onUnshare={onUnshare}
      onBackToList={onBackToList}
      showBackButton={showBackButton}
    />
  )
}

/**
 * Locked note authentication screen
 */
function LockedNotePrompt({
  note,
  onUnlock,
  onDelete,
  onBackToList,
  showBackButton,
}: {
  note: Note
  onUnlock?: (noteId: string, password: string) => Promise<boolean>
  onDelete: (noteId: string, password?: string) => Promise<boolean | void> | void
  onBackToList?: () => void
  showBackButton?: boolean
}) {
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const success = await onUnlock?.(note.id, password)
      if (!success) {
        setErrorMessage("Incorrect password. Please try again.")
      }
    } catch {
      setErrorMessage("Failed to unlock note.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-background h-full animate-in fade-in-50">
      <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs flex flex-col items-center text-center">
        <div className="size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 mb-3 shadow-2xs">
          <Lock className="size-5" />
        </div>

        <h3 className="text-base font-semibold text-foreground tracking-tight">
          {note.title || "Locked Note"}
        </h3>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          This note is password protected. Enter password to view and edit its content.
        </p>

        <form onSubmit={handleUnlockSubmit} className="w-full mt-5 space-y-3">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMessage(null)
              }}
              placeholder="Enter note password..."
              className="pr-10 text-base sm:text-xs font-mono"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>

          {errorMessage && (
            <p className="text-[11px] font-mono text-destructive flex items-center justify-center gap-1">
              <AlertCircle className="size-3 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full font-mono text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                <span>Unlocking...</span>
              </>
            ) : (
              <>
                <LockOpen className="size-3.5 mr-1.5" />
                <span>Unlock Note</span>
              </>
            )}
          </Button>
        </form>

        <div className="w-full mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          {showBackButton && (
            <button
              type="button"
              onClick={onBackToList}
              className="hover:text-foreground cursor-pointer underline underline-offset-2"
            >
              Back to list
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="hover:text-destructive text-muted-foreground/80 cursor-pointer ml-auto"
          >
            Delete note
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteEditorInner({
  note,
  unlockedPassword = "",
  onUpdate,
  onDelete,
  onLock,
  onRemoveLock,
  onRelock,
  onShare,
  onUnshare,
  onBackToList,
  showBackButton = false,
}: {
  note: Note
  unlockedPassword?: string
  onUpdate: (updated: {
    id: string
    title: string
    content: string
    password?: string
  }) => Promise<boolean>
  onDelete: (noteId: string, password?: string) => Promise<boolean | void> | void
  onLock?: (noteId: string, password: string) => Promise<boolean>
  onRemoveLock?: (noteId: string, password: string) => Promise<boolean>
  onRelock?: (noteId: string) => void
  onShare?: (noteId: string) => Promise<{ shareToken: string } | null>
  onUnshare?: (noteId: string) => Promise<boolean>
  onBackToList?: () => void
  showBackButton?: boolean
}) {
  const [title, setTitle] = React.useState(note.title)
  const [content, setContent] = React.useState(note.content || "")
  const [viewMode, setViewMode] = React.useState<"edit" | "preview">("edit")
  const [saveState, setSaveState] = React.useState<SaveState>("saved")
  const [lastSavedTime, setLastSavedTime] = React.useState<string | null>(null)

  // Dialog states for locking note
  const [showLockDialog, setShowLockDialog] = React.useState(false)
  const [lockPassword, setLockPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [lockError, setLockError] = React.useState<string | null>(null)
  const [isLocking, setIsLocking] = React.useState(false)

  // Dialog state for removing lock
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false)
  const [removePassword, setRemovePassword] = React.useState(unlockedPassword)
  const [removeError, setRemoveError] = React.useState<string | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = React.useState(false)
  const [isSharing, setIsSharing] = React.useState(false)
  const [isUnsharing, setIsUnsharing] = React.useState(false)
  const [shareError, setShareError] = React.useState<string | null>(null)
  const [copiedLink, setCopiedLink] = React.useState(false)
  // Track current share state locally; sync from note prop
  const [localIsShared, setLocalIsShared] = React.useState(Boolean(note.is_shared))
  const [localShareToken, setLocalShareToken] = React.useState<string | null>(note.share_token ?? null)

  // Resolve the current origin client-side only to avoid SSR/client hydration mismatch.
  // Initialising to "" ensures server and client render identically on first pass.
  const [origin, setOrigin] = React.useState("")
  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const shareUrl = localShareToken ? `${origin}/share/${localShareToken}` : null


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
          password: note.is_locked ? unlockedPassword : undefined,
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
    [note.id, note.is_locked, unlockedPassword, onUpdate]
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

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Link dialog states
  const [showLinkDialog, setShowLinkDialog] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState("https://")
  const [linkTitle, setLinkTitle] = React.useState("")
  const [linkSelection, setLinkSelection] = React.useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  })

  // Undo / Redo history
  const historyRef = React.useRef<{ content: string; start: number; end: number }[]>([
    { content: note.content || "", start: 0, end: 0 },
  ])
  const historyIndexRef = React.useRef(0)
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)

  const pushHistory = React.useCallback((newContent: string, start: number, end: number) => {
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1)
    truncated.push({ content: newContent, start, end })
    if (truncated.length > 50) {
      truncated.shift()
    }
    historyRef.current = truncated
    historyIndexRef.current = truncated.length - 1
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  const handleUndo = React.useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1
      const entry = historyRef.current[historyIndexRef.current]
      setContent(entry.content)
      triggerAutosave(title, entry.content)
      setCanUndo(historyIndexRef.current > 0)
      setCanRedo(true)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(entry.start, entry.end)
        }
      }, 0)
    }
  }, [title, triggerAutosave])

  const handleRedo = React.useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1
      const entry = historyRef.current[historyIndexRef.current]
      setContent(entry.content)
      triggerAutosave(title, entry.content)
      setCanUndo(true)
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(entry.start, entry.end)
        }
      }, 0)
    }
  }, [title, triggerAutosave])

  const [activeFormats, setActiveFormats] = React.useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    h1: false,
    h2: false,
    h3: false,
    bulletList: false,
    numberList: false,
    taskList: false,
    quote: false,
    codeBlock: false,
  })

  const updateActiveFormats = React.useCallback(() => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const detected = detectActiveFormats(content, start, end)
    setActiveFormats(detected)
  }, [content])

  const applyFormattingResult = React.useCallback(
    (result: { text: string; selection: { start: number; end: number } }) => {
      setContent(result.text)
      triggerAutosave(title, result.text)
      pushHistory(result.text, result.selection.start, result.selection.end)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(result.selection.start, result.selection.end)
          updateActiveFormats()
        }
      }, 0)
    },
    [title, triggerAutosave, pushHistory, updateActiveFormats]
  )

  const handleToolbarAction = React.useCallback(
    (action: ToolbarActionType) => {
      if (viewMode === "preview") {
        setViewMode("edit")
      }

      if (action === "undo") {
        handleUndo()
        return
      }
      if (action === "redo") {
        handleRedo()
        return
      }

      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? content.length
      const end = textarea?.selectionEnd ?? content.length

      switch (action) {
        case "bold":
          applyFormattingResult(toggleInlineFormat(content, start, end, "**", "**"))
          break
        case "italic":
          applyFormattingResult(toggleInlineFormat(content, start, end, "*", "*"))
          break
        case "underline":
          applyFormattingResult(toggleUnderline(content, start, end))
          break
        case "strikethrough":
          applyFormattingResult(toggleInlineFormat(content, start, end, "~~", "~~"))
          break
        case "code":
          applyFormattingResult(toggleInlineFormat(content, start, end, "`", "`"))
          break
        case "h1":
          applyFormattingResult(toggleHeading(content, start, end, 1))
          break
        case "h2":
          applyFormattingResult(toggleHeading(content, start, end, 2))
          break
        case "h3":
          applyFormattingResult(toggleHeading(content, start, end, 3))
          break
        case "bulletList":
          applyFormattingResult(toggleList(content, start, end, "bullet"))
          break
        case "numberList":
          applyFormattingResult(toggleList(content, start, end, "number"))
          break
        case "taskList":
          applyFormattingResult(toggleList(content, start, end, "task"))
          break
        case "quote":
          applyFormattingResult(toggleBlockquote(content, start, end))
          break
        case "codeBlock":
          applyFormattingResult(toggleCodeBlock(content, start, end))
          break
        case "table":
          applyFormattingResult(insertTable(content, start, end))
          break
        case "divider":
          applyFormattingResult(insertHorizontalRule(content, start, end))
          break
        case "clearFormatting":
          applyFormattingResult(clearFormatting(content, start, end))
          break
        case "link": {
          const selectedText = content.slice(start, end).trim()
          setLinkSelection({ start, end })
          if (/^https?:\/\//i.test(selectedText)) {
            setLinkUrl(selectedText)
            setLinkTitle("")
          } else {
            setLinkUrl("https://")
            setLinkTitle(selectedText)
          }
          setShowLinkDialog(true)
          break
        }
      }
    },
    [viewMode, content, handleUndo, handleRedo, applyFormattingResult]
  )

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowLinkDialog(false)
    const result = insertLink(
      content,
      linkSelection.start,
      linkSelection.end,
      linkUrl,
      linkTitle
    )
    applyFormattingResult(result)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    triggerAutosave(title, newContent)
    const start = e.target.selectionStart
    const end = e.target.selectionEnd
    pushHistory(newContent, start, end)
    updateActiveFormats()
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCmd = e.metaKey || e.ctrlKey

    // Indent / outdent with Tab
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? 0
      const end = textarea?.selectionEnd ?? 0
      applyFormattingResult(indentLines(content, start, end, e.shiftKey))
      return
    }

    if (isCmd && !e.shiftKey && e.key.toLowerCase() === "b") {
      e.preventDefault()
      handleToolbarAction("bold")
    } else if (isCmd && !e.shiftKey && e.key.toLowerCase() === "i") {
      e.preventDefault()
      handleToolbarAction("italic")
    } else if (isCmd && !e.shiftKey && e.key.toLowerCase() === "u") {
      e.preventDefault()
      handleToolbarAction("underline")
    } else if (isCmd && !e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault()
      handleToolbarAction("link")
    } else if (isCmd && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault()
      handleToolbarAction("strikethrough")
    } else if (isCmd && !e.shiftKey && e.key.toLowerCase() === "e") {
      e.preventDefault()
      handleToolbarAction("code")
    } else if (isCmd && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault()
      handleUndo()
    } else if (
      (isCmd && e.shiftKey && e.key.toLowerCase() === "z") ||
      (isCmd && e.key.toLowerCase() === "y")
    ) {
      e.preventDefault()
      handleRedo()
    }
  }

  // Handle setting password lock
  const handleLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lockPassword) {
      setLockError("Password cannot be empty.")
      return
    }
    if (lockPassword !== confirmPassword) {
      setLockError("Passwords do not match.")
      return
    }

    setIsLocking(true)
    setLockError(null)

    try {
      const success = await onLock?.(note.id, lockPassword)
      if (success) {
        setShowLockDialog(false)
        setLockPassword("")
        setConfirmPassword("")
      } else {
        setLockError("Failed to lock note.")
      }
    } catch {
      setLockError("An error occurred while locking note.")
    } finally {
      setIsLocking(false)
    }
  }

  // Handle removing password lock
  const handleRemoveLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pwd = removePassword || unlockedPassword
    if (!pwd) {
      setRemoveError("Password is required.")
      return
    }

    setIsRemoving(true)
    setRemoveError(null)

    try {
      const success = await onRemoveLock?.(note.id, pwd)
      if (success) {
        setShowRemoveDialog(false)
        setRemovePassword("")
      } else {
        setRemoveError("Incorrect password.")
      }
    } catch {
      setRemoveError("An error occurred while removing lock.")
    } finally {
      setIsRemoving(false)
    }
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

        {/* Right Toolbar: Lock status, Autosave status, View Mode toggle, Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Share Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setShareError(null)
              setShowShareDialog(true)
            }}
            disabled={Boolean(note.is_locked)}
            className={cn(
              "size-8 cursor-pointer touch-manipulation",
              localIsShared
                ? "text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
            )}
            title={note.is_locked ? "Unlock note to share" : localIsShared ? "Manage share link" : "Share note"}
            aria-label={localIsShared ? "Manage share link" : "Share note"}
          >
            <Globe className="size-3.5" />
          </Button>


          {/* Lock / Security Controls */}
          {note.is_locked ? (

            <div className="flex items-center gap-1">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <LockOpen className="size-3" />
                <span>Unlocked</span>
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRelock?.(note.id)}
                className="h-7.5 px-2 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                title="Lock note now"
              >
                <Lock className="size-3.5 sm:mr-1 text-amber-500" />
                <span className="hidden sm:inline">Relock</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                className="h-7.5 px-2 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                title="Remove password lock"
              >
                <KeyRound className="size-3.5 sm:mr-1 text-muted-foreground" />
                <span className="hidden sm:inline">Remove Lock</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowLockDialog(true)}
              className="size-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer touch-manipulation"
              title="Lock note with password"
              aria-label="Lock note with password"
            >
              <Lock className="size-3.5" />
            </Button>
          )}

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
            onClick={() => onDelete(note.id, note.is_locked ? unlockedPassword : undefined)}
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer touch-manipulation"
            title="Delete this note"
            aria-label="Delete note"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar Strip on Top */}
      <EditorToolbar
        onAction={handleToolbarAction}
        activeFormats={activeFormats}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Main Body: Markdown Textarea or Safe Preview */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        {viewMode === "edit" ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={updateActiveFormats}
            onKeyUp={updateActiveFormats}
            onClick={updateActiveFormats}
            onKeyDown={handleTextareaKeyDown}
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

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground">
              <Globe className="size-4 text-blue-500" />
              <DialogTitle>Share Note</DialogTitle>
            </div>
            <DialogDescription>
              {localIsShared
                ? "This note is publicly shared. Anyone with the link can view it in read-only mode."
                : "Generate a shareable link so anyone can view this note. The link reflects the latest content."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {localIsShared && shareUrl ? (
              <>
                {/* Link display */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 font-mono text-xs text-foreground/80 truncate">
                    {shareUrl}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 font-mono text-xs h-9 cursor-pointer"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                    aria-label="Copy share link"
                  >
                    {copiedLink ? (
                      <><Check className="size-3.5 text-emerald-500" /><span className="ml-1">Copied!</span></>
                    ) : (
                      <><Copy className="size-3.5" /><span className="ml-1">Copy</span></>
                    )}
                  </Button>
                </div>

                {shareError && (
                  <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{shareError}</span>
                  </p>
                )}

                <div className="pt-1 border-t border-border/40 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Revoking the link will make it inaccessible immediately.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUnsharing}
                    className="shrink-0 font-mono text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                    onClick={async () => {
                      setIsUnsharing(true)
                      setShareError(null)
                      try {
                        const ok = await onUnshare?.(note.id)
                        if (ok) {
                          setLocalIsShared(false)
                          setLocalShareToken(null)
                          setShowShareDialog(false)
                        } else {
                          setShareError("Failed to revoke share link.")
                        }
                      } catch {
                        setShareError("Network error.")
                      } finally {
                        setIsUnsharing(false)
                      }
                    }}
                  >
                    {isUnsharing ? (
                      <><Loader2 className="size-3 animate-spin" /><span className="ml-1">Revoking...</span></>
                    ) : (
                      <><Link2Off className="size-3" /><span className="ml-1">Revoke</span></>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-mono text-muted-foreground">
                  The link will always show the latest version of this note.
                  You can revoke it at any time.
                </p>

                {shareError && (
                  <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{shareError}</span>
                  </p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowShareDialog(false)}
                    className="font-mono text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSharing}
                    className="font-mono text-xs cursor-pointer"
                    onClick={async () => {
                      setIsSharing(true)
                      setShareError(null)
                      try {
                        const result = await onShare?.(note.id)
                        if (result?.shareToken) {
                          setLocalIsShared(true)
                          setLocalShareToken(result.shareToken)
                        } else {
                          setShareError("Failed to generate share link.")
                        }
                      } catch {
                        setShareError("Network error.")
                      } finally {
                        setIsSharing(false)
                      }
                    }}
                  >
                    {isSharing ? (
                      <><Loader2 className="size-3 animate-spin mr-1.5" /><span>Generating...</span></>
                    ) : (
                      <><Globe className="size-3 mr-1.5" /><span>Generate Link</span></>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Password Lock Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground">
              <Lock className="size-4 text-amber-500" />
              <DialogTitle>Lock Note with Password</DialogTitle>
            </div>
            <DialogDescription>
              Set a password to protect this note. Once locked, its content will not be visible in search results.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLockSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">
                Set Password
              </label>
              <Input
                type="password"
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                placeholder="Enter password..."
                className="text-base sm:text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password..."
                className="text-base sm:text-xs font-mono"
                required
              />
            </div>

            {lockError && (
              <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{lockError}</span>
              </p>
            )}

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLockDialog(false)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLocking || !lockPassword || !confirmPassword}
                className="font-mono text-xs"
              >
                {isLocking ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                    <span>Locking...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-3 mr-1.5" />
                    <span>Lock Note</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Password Lock Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground">
              <KeyRound className="size-4 text-primary" />
              <DialogTitle>Remove Password Protection</DialogTitle>
            </div>
            <DialogDescription>
              Enter the note&apos;s password to remove lock protection and make it a standard note.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRemoveLockSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">
                Current Password
              </label>
              <Input
                type="password"
                value={removePassword}
                onChange={(e) => setRemovePassword(e.target.value)}
                placeholder="Enter note password..."
                className="text-base sm:text-xs font-mono"
                required
                autoFocus
              />
            </div>

            {removeError && (
              <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{removeError}</span>
              </p>
            )}

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRemoveDialog(false)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRemoving || !removePassword}
                className="font-mono text-xs"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Lock</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Insert Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground">
              <LinkIcon className="size-4 text-primary" />
              <DialogTitle>Insert Link</DialogTitle>
            </div>
            <DialogDescription>
              Add a web link to your note.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">
                Link Text
              </label>
              <Input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Text to display..."
                className="text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">
                URL
              </label>
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-base sm:text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="font-mono text-xs">
                Insert Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
