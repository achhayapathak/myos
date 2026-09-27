import {
  FileText,
  Plus,
  Search,
  Clock,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Notes",
}

const SAMPLE_NOTES = [
  {
    id: "1",
    title: "System Architecture v0.1",
    updated: "10m ago",
    snippet: "Next.js App Router, Supabase RLS, Tailwind v4...",
    active: true,
  },
  {
    id: "2",
    title: "Product Roadmap & Goals",
    updated: "2h ago",
    snippet: "Private single-user productivity engine...",
    active: false,
  },
  {
    id: "3",
    title: "Reading & Learning Notes",
    updated: "1d ago",
    snippet: "PostgreSQL row security policies and index tuning...",
    active: false,
  },
  {
    id: "4",
    title: "Scratchpad Ideas",
    updated: "2d ago",
    snippet: "Command palette keyboard workflow refinements...",
    active: false,
  },
]

export default function NotesPage() {
  return (
    <div className="flex flex-col gap-5 max-w-5xl h-[calc(100vh-8.5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            <FileText className="size-3.5" />
            <span>Markdown Notes</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Notes
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 font-mono text-xs">
            <Plus className="size-3.5" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        {/* Note List Column */}
        <div className="md:col-span-4 border-r border-border/60 flex flex-col justify-between bg-muted/10 p-3">
          <div className="flex flex-col gap-2">
            <div className="relative mb-2">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-background text-xs font-mono placeholder:text-muted-foreground/60 outline-hidden"
                readOnly
              />
            </div>

            <div className="space-y-1">
              {SAMPLE_NOTES.map((note) => (
                <div
                  key={note.id}
                  className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    note.active
                      ? "bg-foreground/10 text-foreground font-semibold"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate">{note.title}</span>
                    <span className="text-[10px] font-mono opacity-60 shrink-0">
                      {note.updated}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground/80 truncate">
                    {note.snippet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
            <span>4 notes total</span>
            <span>Debounced autosave</span>
          </div>
        </div>

        {/* Note Content / Markdown Editor Column */}
        <div className="md:col-span-8 flex flex-col justify-between p-4 md:p-6 bg-background">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <input
                type="text"
                defaultValue="System Architecture v0.1"
                className="text-lg md:text-xl font-bold tracking-tight bg-transparent border-none outline-hidden text-foreground w-full"
                readOnly
              />
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono shrink-0">
                <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                  <Save className="size-3" />
                  <span>Saved</span>
                </span>
              </div>
            </div>

            <div className="font-mono text-xs text-foreground/90 space-y-3 leading-relaxed">
              <p className="text-muted-foreground"># MyOS Architecture Overview</p>
              <p>
                MyOS is built with Next.js App Router, Tailwind CSS, shadcn/ui, and Supabase PostgreSQL.
              </p>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-[11px]">
                <code>- Fast desktop and mobile native feeling<br />- Single-user strict RLS policies<br />- No third-party data tracking</code>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Autosave debouncing is enabled for markdown input.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              <span>Last edited today at 16:45</span>
            </span>
            <span className="text-[10px]">Markdown syntax supported</span>
          </div>
        </div>
      </div>
    </div>
  )
}
