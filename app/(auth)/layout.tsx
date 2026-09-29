import * as React from "react"
import Link from "next/link"
import { Terminal, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      {/* Top Header */}
      <header className="flex w-full max-w-sm items-center justify-between py-2">
        <Link
          href="/login"
          className="flex items-center gap-2 group transition-opacity hover:opacity-80"
        >
          <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-mono font-bold text-xs shadow-xs">
            <Terminal className="size-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight font-mono">
            MyOS
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 text-muted-foreground">
            v0.1
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-sm my-auto py-8">
        {children}
      </main>

      {/* Footer Notice */}
      <footer className="w-full max-w-sm py-4 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="size-3 text-emerald-500" />
          <span>Private Single-User</span>
        </div>
        <span>PostgreSQL RLS</span>
      </footer>
    </div>
  )
}
