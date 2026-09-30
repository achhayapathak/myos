import type { Note } from "@/types/database"

/**
 * Derives a human-readable title from markdown content if title is not explicitly specified.
 */
export function deriveNoteTitle(content: string, fallback = "Untitled Note"): string {
  if (!content || !content.trim()) {
    return fallback
  }

  const lines = content.split("\n")
  for (const line of lines) {
    const cleaned = line
      .replace(/^[#*>\s\-+]+/, "")
      .replace(/^\[[ xX]\]\s+/, "")
      .trim()
    if (cleaned.length > 0) {
      return cleaned.slice(0, 60)
    }
  }

  return fallback
}

/**
 * Extracts a clean plain-text snippet from markdown content for list previews.
 */
export function getNoteSnippet(content: string, maxLength = 90): string {
  if (!content || !content.trim()) {
    return "No content"
  }

  const cleaned = content
    .replace(/^```[\s\S]*?```/gm, "[Code]")
    .replace(/^[#*>\-+`]+ /gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")

  if (!cleaned) return "No content"

  return cleaned.length > maxLength
    ? cleaned.slice(0, maxLength) + "…"
    : cleaned
}

/**
 * Formats an updated_at ISO timestamp into a user-friendly relative representation.
 */
export function formatNoteUpdatedTime(isoString: string): string {
  if (!isoString) return ""

  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ""

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHour / 24)

  if (diffSec < 45) {
    return "Just now"
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date)
}

/**
 * Filters notes matching a search query in their title or content.
 */
export function filterNotes(notes: Note[], query: string): Note[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return notes
  }

  return notes.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(trimmed)
    const contentMatch = (note.content || "").toLowerCase().includes(trimmed)
    return titleMatch || contentMatch
  })
}

/**
 * Calculates words and character counts of markdown text.
 */
export function getNoteStats(content: string): { words: number; chars: number } {
  if (!content) return { words: 0, chars: 0 }

  const trimmed = content.trim()
  const chars = content.length
  const words = trimmed ? trimmed.split(/\s+/).length : 0

  return { words, chars }
}
