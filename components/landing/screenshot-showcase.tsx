"use client"

import { useState } from "react"
import Image from "next/image"

const screenshots = [
  {
    id: "today",
    label: "Today",
    src: "/images/myos/today-preview.png",
    caption:
      "Everything that matters today — tasks, reminders, events, and focus sessions in one view.",
  },
  {
    id: "tasks",
    label: "Tasks",
    src: "/images/myos/tasks.png",
    caption:
      "Capture tasks quickly, set priorities, and track what needs to get done.",
  },
  {
    id: "notes",
    label: "Notes",
    src: "/images/myos/notes.png",
    caption:
      "Markdown-friendly workspace for ideas, technical notes, and meeting takeaways.",
  },
  {
    id: "focus",
    label: "Focus",
    src: "/images/myos/focus.png",
    caption:
      "Pomodoro-powered focus sessions for deliberate, uninterrupted deep work.",
  },
  {
    id: "calendar",
    label: "Calendar",
    src: "/images/myos/calendar.png",
    caption:
      "Your schedule at a glance — see what's coming up and plan your time.",
  },
  {
    id: "habits",
    label: "Habits",
    src: "/images/myos/habits.png",
    caption:
      "Track recurring behaviors, monitor consistency, and build routines.",
  },
  {
    id: "reminders",
    label: "Reminders",
    src: "/images/myos/reminders.png",
    caption:
      "Keep commitments and follow-ups visible instead of relying on memory.",
  },
] as const

export function ScreenshotShowcase() {
  const [active, setActive] = useState<string>("today")
  const current = screenshots.find((s) => s.id === active) ?? screenshots[0]

  return (
    <div>
      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-4 mb-6 scrollbar-none"
        role="tablist"
        aria-label="Product screenshots"
      >
        {screenshots.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={active === s.id}
            aria-controls={`screenshot-panel-${s.id}`}
            onClick={() => setActive(s.id)}
            className={`shrink-0 text-xs font-mono px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              active === s.id
                ? "bg-neutral-800 text-white"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Screenshot with browser chrome */}
      <div
        id={`screenshot-panel-${current.id}`}
        role="tabpanel"
        className="rounded-xl border border-neutral-800 bg-[#141414] overflow-hidden shadow-2xl shadow-black/40"
      >
        {/* Browser chrome bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800 bg-[#0f0f0f]">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-neutral-700" />
            <span className="size-2.5 rounded-full bg-neutral-700" />
            <span className="size-2.5 rounded-full bg-neutral-700" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-[11px] text-neutral-600 font-mono">
              myos.app/{current.id === "today" ? "" : current.id}
            </span>
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Screenshot image */}
        <Image
          src={current.src}
          alt={current.caption}
          width={1440}
          height={900}
          className="w-full h-auto"
          priority={current.id === "today"}
        />
      </div>

      {/* Caption */}
      <p className="text-sm text-neutral-400 text-center mt-4 max-w-lg mx-auto">
        {current.caption}
      </p>
    </div>
  )
}
