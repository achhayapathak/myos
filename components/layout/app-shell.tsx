"use client"

import * as React from "react"
import { DesktopSidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { MobileBottomNav } from "@/components/layout/bottom-nav"
import { CommandPaletteProvider } from "@/components/command-palette"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
        {/* Desktop Sidebar */}
        <DesktopSidebar />

        {/* Main Content Column */}
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </CommandPaletteProvider>
  )
}
