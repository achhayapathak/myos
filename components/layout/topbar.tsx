"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS } from "@/components/layout/nav-items"
import { useCommandPalette } from "@/components/command-palette"
import { ThemeToggle } from "@/components/theme-toggle"
import { Search, Terminal, Database } from "lucide-react"

export function Topbar() {
  const pathname = usePathname()
  const { setOpen } = useCommandPalette()

  // Find active nav item or match title
  const currentItem = NAV_ITEMS.find(
    (item) => item.href === pathname || (item.href !== "/" && pathname?.startsWith(item.href))
  )
  const title = currentItem ? currentItem.title : "Dashboard"

  return (
    <header className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-border/70 bg-background/80 px-4 md:px-6 backdrop-blur-md transition-colors select-none">
      {/* Left: Mobile Brand & Desktop Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile brand badge */}
        <Link
          href="/today"
          className="md:hidden flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          <div className="size-5 rounded bg-foreground text-background flex items-center justify-center font-mono font-bold text-[10px]">
            <Terminal className="size-3" />
          </div>
          <span className="font-semibold text-xs tracking-tight">MyOS</span>
        </Link>

        {/* Separator on mobile */}
        <span className="md:hidden text-muted-foreground/40 font-mono text-xs">/</span>

        {/* Current Section Title / Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline font-mono text-xs text-muted-foreground">myos</span>
          <span className="hidden md:inline text-muted-foreground/40 font-mono text-xs">/</span>
          <h1 className="font-semibold text-xs md:text-sm tracking-tight text-foreground flex items-center gap-1.5">
            {currentItem && React.createElement(currentItem.icon, { className: "size-3.5 text-muted-foreground hidden sm:inline" })}
            <span>{title}</span>
          </h1>
        </div>
      </div>

      {/* Right: Actions, Command Palette, Status, Theme */}
      <div className="flex items-center gap-2">
        {/* Command palette search button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 h-7 px-2.5 rounded-md border border-border/60 bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-mono transition-colors shadow-2xs group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Search className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border bg-background px-1 text-[9px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Architecture status badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/50 bg-muted/30 text-[10px] font-mono text-muted-foreground">
          <Database className="size-3 text-emerald-500" />
          <span>PostgreSQL RLS</span>
        </div>

        {/* Theme toggle for topbar */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
