"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/components/layout/nav-items"
import { useCommandPalette } from "@/components/command-palette"
import { ThemeToggle } from "@/components/theme-toggle"
import { Search, Terminal, ShieldCheck, Settings } from "lucide-react"

export function DesktopSidebar() {
  const pathname = usePathname()
  const { setOpen } = useCommandPalette()

  // Primary navigation (excluding Settings for the bottom section)
  const primaryNavItems = NAV_ITEMS.filter((item) => item.href !== "/settings")

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden md:flex h-screen w-60 flex-col justify-between border-r border-border/80 bg-sidebar/50 backdrop-blur-md sticky top-0 shrink-0 select-none z-20"
    >
      {/* Top Header & Search */}
      <div className="flex flex-col gap-4 p-4">
        {/* Brand */}
        <Link
          href="/today"
          className="flex items-center justify-between group px-2 py-1 rounded-md transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              <Terminal className="size-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight leading-none text-foreground">
                MyOS
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-none mt-1">
                private-os
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 text-muted-foreground">
            v0.1
          </span>
        </Link>

        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-mono transition-all shadow-2xs group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span>Search / Jump</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Main Navigation Links */}
        <nav className="flex flex-col gap-1 mt-1" aria-label="Main sections">
          <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 font-mono">
            Navigation
          </div>
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group relative",
                  isActive
                    ? "bg-foreground/10 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono text-muted-foreground/60 transition-opacity opacity-0 group-hover:opacity-100",
                    isActive && "opacity-60"
                  )}
                >
                  ⌥{item.shortcut}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer: Settings, Theme & User status */}
      <div className="flex flex-col gap-2 p-3 border-t border-border/60">
        <Link
          href="/settings"
          className={cn(
            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group",
            pathname === "/settings"
              ? "bg-foreground/10 text-foreground font-semibold"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100">
            ⌥7
          </span>
        </Link>

        {/* User Status Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40 border border-border/40 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-500" />
              <span>Owner Session</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
