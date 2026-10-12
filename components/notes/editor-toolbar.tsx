"use client"

import * as React from "react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  FileCode,
  Link as LinkIcon,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Eraser,
  CircleHelp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActiveFormats } from "@/lib/notes/editor-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export type ToolbarActionType =
  | "undo"
  | "redo"
  | "h1"
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "bulletList"
  | "numberList"
  | "taskList"
  | "quote"
  | "codeBlock"
  | "link"
  | "table"
  | "divider"
  | "clearFormatting"

interface EditorToolbarProps {
  onAction: (action: ToolbarActionType) => void
  activeFormats: ActiveFormats
  canUndo: boolean
  canRedo: boolean
  disabled?: boolean
  className?: string
}

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  isActive = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  const tooltip = shortcut ? `${label} (${shortcut})` : label

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent default so textarea doesn't lose selection/focus on click
        e.preventDefault()
      }}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "size-7 shrink-0 rounded-md flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none",
        isActive
          ? "bg-primary/15 text-primary shadow-2xs font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95",
        disabled && "opacity-35 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground active:scale-100"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function ToolbarSeparator() {
  return <div className="h-4 w-px bg-border/60 mx-1 shrink-0" aria-hidden="true" />
}

export function EditorToolbar({
  onAction,
  activeFormats,
  canUndo,
  canRedo,
  disabled = false,
  className,
}: EditorToolbarProps) {
  const [showHelpDialog, setShowHelpDialog] = React.useState(false)

  return (
    <>
      <div
        className={cn(
          "w-full px-2 py-1.5 border-b border-border/50 bg-muted/15 flex items-center gap-0.5 overflow-x-auto select-none shrink-0 scrollbar-none",
          className
        )}
        role="toolbar"
        aria-label="Text Formatting Tools"
      >
        {/* Group 1: Undo & Redo */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={Undo2}
            label="Undo"
            shortcut="⌘Z"
            disabled={disabled || !canUndo}
            onClick={() => onAction("undo")}
          />
          <ToolbarButton
            icon={Redo2}
            label="Redo"
            shortcut="⌘⇧Z"
            disabled={disabled || !canRedo}
            onClick={() => onAction("redo")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 2: Headings */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={Heading1}
            label="Heading 1"
            isActive={activeFormats.h1}
            disabled={disabled}
            onClick={() => onAction("h1")}
          />
          <ToolbarButton
            icon={Heading2}
            label="Heading 2"
            isActive={activeFormats.h2}
            disabled={disabled}
            onClick={() => onAction("h2")}
          />
          <ToolbarButton
            icon={Heading3}
            label="Heading 3"
            isActive={activeFormats.h3}
            disabled={disabled}
            onClick={() => onAction("h3")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 3: Inline Text Formatting */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            shortcut="⌘B"
            isActive={activeFormats.bold}
            disabled={disabled}
            onClick={() => onAction("bold")}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            shortcut="⌘I"
            isActive={activeFormats.italic}
            disabled={disabled}
            onClick={() => onAction("italic")}
          />
          <ToolbarButton
            icon={Underline}
            label="Underline"
            shortcut="⌘U"
            isActive={activeFormats.underline}
            disabled={disabled}
            onClick={() => onAction("underline")}
          />
          <ToolbarButton
            icon={Strikethrough}
            label="Strikethrough"
            shortcut="⌘⇧X"
            isActive={activeFormats.strikethrough}
            disabled={disabled}
            onClick={() => onAction("strikethrough")}
          />
          <ToolbarButton
            icon={Code}
            label="Inline Code"
            shortcut="⌘E"
            isActive={activeFormats.code}
            disabled={disabled}
            onClick={() => onAction("code")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 4: Lists & Organization */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={List}
            label="Bulleted List"
            isActive={activeFormats.bulletList}
            disabled={disabled}
            onClick={() => onAction("bulletList")}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered List"
            isActive={activeFormats.numberList}
            disabled={disabled}
            onClick={() => onAction("numberList")}
          />
          <ToolbarButton
            icon={ListTodo}
            label="Task Checklist"
            isActive={activeFormats.taskList}
            disabled={disabled}
            onClick={() => onAction("taskList")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 5: Blocks */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={Quote}
            label="Quote"
            isActive={activeFormats.quote}
            disabled={disabled}
            onClick={() => onAction("quote")}
          />
          <ToolbarButton
            icon={FileCode}
            label="Code Block"
            isActive={activeFormats.codeBlock}
            disabled={disabled}
            onClick={() => onAction("codeBlock")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 6: Inserts */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            icon={LinkIcon}
            label="Insert Link"
            shortcut="⌘K"
            disabled={disabled}
            onClick={() => onAction("link")}
          />
          <ToolbarButton
            icon={TableIcon}
            label="Insert Table"
            disabled={disabled}
            onClick={() => onAction("table")}
          />
          <ToolbarButton
            icon={Minus}
            label="Divider Line"
            disabled={disabled}
            onClick={() => onAction("divider")}
          />
        </div>

        <ToolbarSeparator />

        {/* Group 7: Utilities */}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <ToolbarButton
            icon={Eraser}
            label="Clear Formatting"
            disabled={disabled}
            onClick={() => onAction("clearFormatting")}
          />
          <ToolbarButton
            icon={CircleHelp}
            label="Formatting Guide & Shortcuts"
            disabled={disabled}
            onClick={() => setShowHelpDialog(true)}
          />
        </div>
      </div>

      {/* Formatting & Shortcuts Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
              <CircleHelp className="size-4 text-primary" />
              Editor Shortcuts & Markdown Guide
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-muted-foreground">
              Format quickly using toolbar buttons or keyboard shortcuts:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/30">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-foreground">Inline Formatting</p>
                <p className="text-muted-foreground flex justify-between pr-2">
                  <span>Bold</span> <kbd className="px-1 rounded bg-muted border border-border">⌘B</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between pr-2">
                  <span>Italic</span> <kbd className="px-1 rounded bg-muted border border-border">⌘I</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between pr-2">
                  <span>Underline</span> <kbd className="px-1 rounded bg-muted border border-border">⌘U</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between pr-2">
                  <span>Strike</span> <kbd className="px-1 rounded bg-muted border border-border">⌘⇧X</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between pr-2">
                  <span>Inline Code</span> <kbd className="px-1 rounded bg-muted border border-border">⌘E</kbd>
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-foreground">Navigation & Blocks</p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Link</span> <kbd className="px-1 rounded bg-muted border border-border">⌘K</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Indent</span> <kbd className="px-1 rounded bg-muted border border-border">Tab</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Outdent</span> <kbd className="px-1 rounded bg-muted border border-border">⇧Tab</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Undo</span> <kbd className="px-1 rounded bg-muted border border-border">⌘Z</kbd>
                </p>
                <p className="text-muted-foreground flex justify-between">
                  <span>Redo</span> <kbd className="px-1 rounded bg-muted border border-border">⌘⇧Z</kbd>
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground">Markdown Syntax Examples</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span><code># Heading 1</code></span>
                <span><code>- Bullet List</code></span>
                <span><code>## Heading 2</code></span>
                <span><code>1. Numbered List</code></span>
                <span><code>### Heading 3</code></span>
                <span><code>- [ ] Task checkbox</code></span>
                <span><code>&gt; Blockquote</code></span>
                <span><code>--- Divider</code></span>
                <span><code>&lt;u&gt;Underline&lt;/u&gt;</code></span>
                <span><code>| Col 1 | Col 2 | Table</code></span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
