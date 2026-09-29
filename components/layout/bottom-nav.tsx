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
} from "lucide-react"
import { logout } from "@/app/(auth)/actions"
import { ThemeToggle } from "@/components/theme-toggle"
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
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isSecondaryActive = SECONDARY_MOBILE_ITEMS.some((item) => pathname?.startsWith(item.href))

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-md px-2 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none"
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
                  "flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-all group",
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
              "flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-all group",
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

      {/* Secondary Navigation Dialog */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-md p-4" showCloseButton={false}>
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
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <div className="flex flex-col gap-1 py-2">
            {SECONDARY_MOBILE_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg text-xs transition-colors",
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
              className="flex w-full items-center gap-2 p-2 rounded-lg text-xs font-mono text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
