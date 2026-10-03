import Link from "next/link"
import {
  WifiOff,
  RefreshCw,
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  Bell,
  Sun,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Offline",
  description: "MyOS is operating in offline mode.",
}

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 text-center max-w-xl mx-auto">
      {/* Offline Icon Badge */}
      <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-6 shadow-2xs">
        <WifiOff className="size-8" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge
          variant="outline"
          className="font-mono text-[10px] uppercase tracking-widest border-destructive/30 text-destructive bg-destructive/5 px-2.5 py-0.5"
        >
          Offline Application Shell
        </Badge>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        You are currently offline
      </h1>

      <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
        MyOS has loaded the offline application shell. You can browse previously cached views, but creating, editing, or deleting items requires an active network connection.
      </p>

      {/* Explicit Connectivity Notice */}
      <div className="mt-6 p-4 rounded-xl border border-border/60 bg-card text-left flex items-start gap-3 w-full shadow-2xs">
        <ShieldAlert className="size-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex flex-col text-xs leading-relaxed">
          <span className="font-semibold text-foreground">
            Explicit Database Safety
          </span>
          <span className="text-muted-foreground mt-0.5">
            To prevent data loss and conflicting edits, database mutations are paused until your connection is restored.
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <a href="/today">
          <Button size="sm" className="gap-2 font-mono text-xs">
            <RefreshCw className="size-3.5" />
            <span>Try Reconnecting</span>
          </Button>
        </a>

        <Link href="/today">
          <Button variant="outline" size="sm" className="font-mono text-xs">
            Open Today Dashboard
          </Button>
        </Link>
      </div>

      {/* Cached Sections Navigation */}
      <div className="mt-10 pt-8 border-t border-border/50 w-full flex flex-col items-center">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
          Browse Cached Sections
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
          <Link
            href="/today"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <Sun className="size-3.5 text-amber-500" />
            <span>Today</span>
          </Link>

          <Link
            href="/tasks"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <CheckSquare className="size-3.5 text-blue-500" />
            <span>Tasks</span>
          </Link>

          <Link
            href="/notes"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <FileText className="size-3.5 text-emerald-500" />
            <span>Notes</span>
          </Link>

          <Link
            href="/focus"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <Clock className="size-3.5 text-red-500" />
            <span>Focus</span>
          </Link>

          <Link
            href="/calendar"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <Calendar className="size-3.5 text-purple-500" />
            <span>Calendar</span>
          </Link>

          <Link
            href="/reminders"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors text-xs font-medium text-foreground"
          >
            <Bell className="size-3.5 text-pink-500" />
            <span>Reminders</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
