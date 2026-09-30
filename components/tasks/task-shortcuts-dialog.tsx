"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

interface TaskShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { key: "C / N", description: "Create new task" },
  { key: "/", description: "Focus search bar" },
  { key: "Esc", description: "Close dialog or clear search" },
  { key: "⌘ + Enter", description: "Save task inside modal" },
  { key: "?", description: "View keyboard shortcuts" },
]

export function TaskShortcutsDialog({
  open,
  onOpenChange,
}: TaskShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
            <Keyboard className="size-3.5" />
            <span>Shortcuts</span>
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight">
            Tasks Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quickly navigate and manage your tasks using your keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20 text-xs font-mono"
            >
              <span className="text-muted-foreground">{item.description}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-foreground font-semibold">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
