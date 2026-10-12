import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MarkdownPreview } from "@/lib/notes/markdown"
import type { Metadata } from "next"
import type { Database } from "@/types/database"

interface SharedNotePageProps {
  params: Promise<{ token: string }>
}

/**
 * Fetch a shared note by its opaque token using the anon key.
 * RLS allows anon reads only on rows where is_shared = true.
 * We never select password_hash here.
 */
async function getSharedNote(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  // Use a plain anon client — no cookies, no auth session.
  const supabase = createClient<Database>(url, anonKey)

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, updated_at")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function generateMetadata({
  params,
}: SharedNotePageProps): Promise<Metadata> {
  const { token } = await params
  const note = await getSharedNote(token)

  if (!note) {
    return { title: "Note not found" }
  }

  return {
    title: note.title,
    description: `Shared note: ${note.title}`,
  }
}

export default async function SharedNotePage({ params }: SharedNotePageProps) {
  const { token } = await params
  const note = await getSharedNote(token)

  if (!note) {
    notFound()
  }

  const updatedAt = new Date(note.updated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              Shared Note
            </span>
            <span className="text-muted-foreground/40 shrink-0">·</span>
            <span
              className="text-xs font-mono text-muted-foreground truncate"
              title={note.title}
            >
              {note.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded border border-border/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Read-only
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Note title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
            {note.title}
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Last updated {updatedAt}
          </p>
          <div className="mt-4 border-b border-border/40" />
        </div>

        {/* Markdown rendered content */}
        <div className="prose-sm">
          <MarkdownPreview
            content={note.content}
            className="font-sans space-y-1 text-sm"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/40 py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-[11px] font-mono text-muted-foreground/60">
          Shared via{" "}
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            MyOS
          </Link>{" "}
          · Read-only public view
        </div>
      </footer>
    </div>
  )
}
