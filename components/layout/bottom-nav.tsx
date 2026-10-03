"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sun,
  CheckSquare,
  Timer,
  FileText,
  Calendar,
  Bell,
  Settings,
  MoreHorizontal,
  X,
  LogOut,
  Search,
} from "lucide-react"
import { logout } from "@/app/(auth)/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCommandPalette } from "@/components/command-palette"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PRIMARY_MOBILE_ITEMS = [
  { title: "Today", href: "/today", icon: Sun },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Focus", href: "/focus", icon: Timer },
  { title: "Notes", href: "/notes", icon: FileText },
]

const SECONDARY_MOBILE_ITEMS = [
  { title: "Calendar", href: "/calendar", icon: Calendar, desc: "Schedule & event timeline" },
  { title: "Reminders", href: "/reminders", icon: Bell, desc: "Time-based alerts" },
  { title: "Settings", href: "/settings", icon: Settings, desc: "Preferences & system controls" },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { setOpen: setCommandPaletteOpen } = useCommandPalette()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isSecondaryActive = SECONDARY_MOBILE_ITEMS.some((item) => pathname?.startsWith(item.href))

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-md px-1 sm:px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none"
      >
        <div className="flex items-center justify-around">
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 sm:px-2 rounded-lg text-[10px] font-medium transition-all group active:scale-95 touch-manipulation",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    isActive ? "bg-foreground/10 text-foreground" : "group-hover:bg-muted"
                  )}
                >
                  <Icon className="size-4.5" />
                </div>
                <span className="mt-0.5 tracking-tight">{item.title}</span>
              </Link>
            )
          })}

          {/* 5th item: More / Secondary Navigation */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation options"
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 sm:px-2 rounded-lg text-[10px] font-medium transition-all group active:scale-95 touch-manipulation cursor-pointer",
              isSecondaryActive || moreOpen
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                isSecondaryActive || moreOpen ? "bg-foreground/10 text-foreground" : "group-hover:bg-muted"
              )}
            >
              <MoreHorizontal className="size-4.5" />
            </div>
            <span className="mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Secondary Navigation Dialog - Bottom sheet on mobile for one-handed thumb reach */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          className="fixed bottom-0 top-auto left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 translate-x-0 sm:-translate-x-1/2 translate-y-0 sm:-translate-y-1/2 w-full max-w-full sm:max-w-md rounded-b-none sm:rounded-xl rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-popover ring-1 ring-foreground/10 shadow-xl"
          showCloseButton={false}
        >
          {/* Subtle drag handle visual for bottom sheet */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2 sm:hidden" />

          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div>
              <DialogTitle className="text-sm font-semibold">More Sections</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Secondary navigation and system settings
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="p-2 -mr-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <div className="flex flex-col gap-1 py-2">
            {/* Command Palette Shortcut Button */}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false)
                setCommandPaletteOpen(true)
              }}
              className="flex items-center justify-between w-full min-h-[44px] p-2.5 rounded-lg text-xs transition-colors bg-muted/40 hover:bg-muted/70 active:bg-muted/90 text-foreground text-left cursor-pointer border border-border/40 mb-1 touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-foreground text-background">
                  <Search className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Command Palette</span>
                  <span className="text-[11px] text-muted-foreground">Search & quick actions</span>
                </div>
              </div>
              <kbd className="h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground flex">
                ⌘K
              </kbd>
            </button>
            {SECONDARY_MOBILE_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 min-h-[44px] p-2.5 rounded-lg text-xs transition-colors active:bg-muted/90 touch-manipulation",
                    isActive
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-md",
                      isActive ? "bg-foreground text-background" : "bg-muted text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground font-mono">Appearance</span>
            <ThemeToggle />
          </div>

          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-2.5 min-h-[44px] p-2 rounded-lg text-xs font-mono text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors cursor-pointer touch-manipulation"
            >
              <LogOut className="size-4" />
              <span>Sign out of MyOS</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
