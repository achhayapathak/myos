"use client"

import * as React from "react"
import {
  Play,
  RotateCcw,
  Coffee,
  CheckCircle,
  AlertCircle,
  X,
  Radio,
  Timer,
  Pause,
  Sliders,
  Minus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PomodoroType, PomodoroSession } from "@/types/database"
import type { FocusPageData, ActivePomodoroSession } from "@/lib/focus/data"
import {
  POMODORO_MODES,
  derivePomodoroMode,
  calculateRemainingSeconds,
  isSessionCompleted,
  type PomodoroState,
  type PomodoroMode,
} from "@/lib/focus/timer-utils"
import {
  startPomodoroSession,
  completePomodoroSession,
  cancelPomodoroSession,
  associateTaskWithSession,
  pausePomodoroSession,
  resumePomodoroSession,
} from "@/app/(app)/focus/actions"
import { toggleTaskStatus } from "@/app/(app)/tasks/actions"
import { PomodoroTimerDisplay } from "./pomodoro-timer-display"
import { TaskAssociationSelector } from "./task-association-selector"
import { SessionStats } from "./session-stats"
import { cn } from "@/lib/utils"

/**
 * Plays a clean synthesizer chime when a focus session completes.
 */
function playChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3) // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch {
    // Ignore if audio permissions or background audio blocked
  }
}

interface FocusViewProps {
  initialData: FocusPageData
}

export function FocusView({ initialData }: FocusViewProps) {
  const [activeSession, setActiveSession] = React.useState<ActivePomodoroSession | null>(
    initialData.activeSession
  )
  const [completedSessions, setCompletedSessions] = React.useState(
    initialData.completedSessionsToday
  )

  const [selectedMode, setSelectedMode] = React.useState<PomodoroMode>(() => {
    if (initialData.activeSession) {
      return derivePomodoroMode(
        initialData.activeSession.type,
        initialData.activeSession.duration_seconds
      )
    }
    return "short_focus"
  })

  // Custom minutes state with persistence
  const [customFocusMinutes, setCustomFocusMinutes] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("myos_custom_focus_minutes")
        if (stored) {
          const val = parseInt(stored, 10)
          if (!isNaN(val) && val >= 1 && val <= 180) return val
        }
      } catch {
        // Ignore
      }
    }
    return 45
  })

  const [customBreakMinutes, setCustomBreakMinutes] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("myos_custom_break_minutes")
        if (stored) {
          const val = parseInt(stored, 10)
          if (!isNaN(val) && val >= 1 && val <= 60) return val
        }
      } catch {
        // Ignore
      }
    }
    return 10
  })

  const handleUpdateCustomMinutes = React.useCallback(
    (minutes: number, category: "focus" | "break") => {
      const maxVal = category === "focus" ? 180 : 60
      const clamped = Math.max(1, Math.min(maxVal, isNaN(minutes) ? 1 : minutes))
      if (category === "focus") {
        setCustomFocusMinutes(clamped)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("myos_custom_focus_minutes", String(clamped))
          } catch {
            // Ignore
          }
        }
      } else {
        setCustomBreakMinutes(clamped)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("myos_custom_break_minutes", String(clamped))
          } catch {
            // Ignore
          }
        }
      }
    },
    []
  )

  // Preferred sub-modes when switching between Focus and Break tabs
  const [preferredFocusMode, setPreferredFocusMode] = React.useState<
    "short_focus" | "long_focus" | "custom_focus"
  >(() => {
    if (initialData.activeSession && initialData.activeSession.type === "focus") {
      const m = derivePomodoroMode(
        initialData.activeSession.type,
        initialData.activeSession.duration_seconds
      )
      return m === "long_focus" ? "long_focus" : m === "custom_focus" ? "custom_focus" : "short_focus"
    }
    return "short_focus"
  })

  const [preferredBreakMode, setPreferredBreakMode] = React.useState<
    "short_break" | "long_break" | "custom_break"
  >(() => {
    if (initialData.activeSession && initialData.activeSession.type !== "focus") {
      const m = derivePomodoroMode(
        initialData.activeSession.type,
        initialData.activeSession.duration_seconds
      )
      return m === "long_break" ? "long_break" : m === "custom_break" ? "custom_break" : "short_break"
    }
    return "short_break"
  })

  const selectedType: PomodoroType = activeSession
    ? activeSession.type
    : selectedMode === "custom_focus"
    ? "focus"
    : selectedMode === "custom_break"
    ? customBreakMinutes > 5 ? "long_break" : "short_break"
    : POMODORO_MODES[selectedMode].type

  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(
    initialData.activeSession?.task_id || null
  )

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isActionPending, startTransition] = React.useTransition()

  // Track remaining seconds when the session is paused
  const [pausedSeconds, setPausedSeconds] = React.useState<number | null>(() => {
    if (typeof window !== "undefined" && initialData.activeSession) {
      try {
        const stored = localStorage.getItem(`myos_focus_paused_${initialData.activeSession.id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (typeof parsed.remainingSeconds === "number") {
            return parsed.remainingSeconds
          }
        }
      } catch {
        // Ignore localStorage error
      }
    }
    return initialData.activeSession?.paused_at
      ? calculateRemainingSeconds(
          initialData.activeSession.started_at,
          initialData.activeSession.duration_seconds,
          new Date(initialData.activeSession.paused_at).getTime()
        )
      : null
  })

  const isPaused = pausedSeconds !== null
  const isSessionRunning = Boolean(activeSession && !activeSession.ended_at && !isPaused)

  // Subscribes to time ticks only when a session is active and not paused.
  // When idle or paused, no timer is created, eliminating unnecessary React re-renders.
  const [currentTime, setCurrentTime] = React.useState<number>(0)

  React.useEffect(() => {
    if (!isSessionRunning) {
      return
    }

    const onWake = () => setCurrentTime(Date.now())

    // Sync immediately on mount / session activation via callback to avoid cascading renders
    const initialSync = setTimeout(onWake, 0)

    // 1000ms tick matches countdown second precision without excessive wakeups
    const interval = setInterval(onWake, 1000)

    document.addEventListener("visibilitychange", onWake)
    window.addEventListener("focus", onWake)
    window.addEventListener("online", onWake)

    return () => {
      clearTimeout(initialSync)
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onWake)
      window.removeEventListener("focus", onWake)
      window.removeEventListener("online", onWake)
    }
  }, [isSessionRunning])

  // Derived total focus minutes
  const totalFocusMinutes = React.useMemo(() => {
    const totalSec = completedSessions
      .filter((s) => s.type === "focus")
      .reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
    return Math.round(totalSec / 60)
  }, [completedSessions])

  // Determine current Pomodoro state and remaining seconds strictly from timestamps
  const { state, remainingSeconds, isDone } = React.useMemo(() => {
    if (!activeSession) {
      const idleDuration =
        selectedMode === "custom_focus"
          ? customFocusMinutes * 60
          : selectedMode === "custom_break"
          ? customBreakMinutes * 60
          : POMODORO_MODES[selectedMode].durationSeconds

      return {
        state: "IDLE" as PomodoroState,
        remainingSeconds: idleDuration,
        isDone: false,
      }
    }

    // Freeze display time and progress when paused
    if (isPaused && pausedSeconds !== null) {
      return {
        state: "PAUSED" as PomodoroState,
        remainingSeconds: pausedSeconds,
        isDone: false,
      }
    }

    const effectiveNow =
      currentTime > 0
        ? currentTime
        : new Date(activeSession.started_at).getTime()

    const remaining = calculateRemainingSeconds(
      activeSession.started_at,
      activeSession.duration_seconds,
      effectiveNow
    )
    const completed = isSessionCompleted(
      activeSession.started_at,
      activeSession.duration_seconds,
      effectiveNow
    )

    if (activeSession.type === "focus") {
      return {
        state: (completed ? "FOCUS_COMPLETE" : "FOCUSING") as PomodoroState,
        remainingSeconds: remaining,
        isDone: completed,
      }
    }

    // Short or long break
    return {
      state: (completed ? "BREAK_COMPLETE" : "SHORT_BREAK") as PomodoroState,
      remainingSeconds: remaining,
      isDone: completed,
    }
  }, [
    activeSession,
    currentTime,
    selectedMode,
    isPaused,
    pausedSeconds,
    customFocusMinutes,
    customBreakMinutes,
  ])

  // Track if completion was already persisted to avoid duplicate network calls
  const completionHandledRef = React.useRef<string | null>(null)

  // Handle completion when time runs out
  React.useEffect(() => {
    if (!activeSession || !isDone || completionHandledRef.current === activeSession.id) {
      return
    }

    completionHandledRef.current = activeSession.id
    playChime()

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`myos_focus_paused_${activeSession.id}`)
      } catch {
        // Ignore
      }
    }
    setPausedSeconds(null)

    const finishedSession: PomodoroSession & { task_title?: string | null } = {
      ...activeSession,
      ended_at: new Date().toISOString(),
    }

    // Persist completed session asynchronously
    void completePomodoroSession(activeSession.id).then(() => {
      setCompletedSessions((prev) => [finishedSession, ...prev])
    })
  }, [activeSession, isDone])

  // Start Session
  const handleStartSession = React.useCallback(
    (target: PomodoroMode | PomodoroType | "break" = selectedMode) => {
      setErrorMessage(null)
      let modeToStart: PomodoroMode
      if (target === "focus") {
        modeToStart = preferredFocusMode
      } else if (target === "break") {
        modeToStart = preferredBreakMode
      } else if (target === "short_break") {
        modeToStart = "short_break"
      } else if (target === "long_break") {
        modeToStart = "long_break"
      } else {
        modeToStart = target
      }

      let type: PomodoroType
      let durationSeconds: number

      if (modeToStart === "custom_focus") {
        type = "focus"
        durationSeconds = customFocusMinutes * 60
      } else if (modeToStart === "custom_break") {
        type = customBreakMinutes > 5 ? "long_break" : "short_break"
        durationSeconds = customBreakMinutes * 60
      } else {
        const config = POMODORO_MODES[modeToStart]
        type = config.type
        durationSeconds = config.durationSeconds
      }

      setSelectedMode(modeToStart)
      setPausedSeconds(null)

      startTransition(async () => {
        try {
          const res = await startPomodoroSession({
            type,
            duration_seconds: durationSeconds,
            task_id: type === "focus" ? selectedTaskId : null,
          })

          if (!res.success || !res.data) {
            setErrorMessage(res.error || "Failed to start session.")
            return
          }

          const taskTitle =
            initialData.availableTasks.find((t) => t.id === selectedTaskId)?.title || null
          const sessionWithTask: ActivePomodoroSession = {
            ...res.data,
            task_title: taskTitle,
          }

          setActiveSession(sessionWithTask)
          completionHandledRef.current = null
        } catch {
          setErrorMessage("Network error starting session.")
        }
      })
    },
    [
      initialData.availableTasks,
      selectedTaskId,
      selectedMode,
      preferredFocusMode,
      preferredBreakMode,
      customFocusMinutes,
      customBreakMinutes,
    ]
  )

  // Pause Session
  const handlePauseSession = React.useCallback(() => {
    if (!activeSession || isPaused) return
    const currentRemaining = remainingSeconds
    setPausedSeconds(currentRemaining)

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `myos_focus_paused_${activeSession.id}`,
          JSON.stringify({
            id: activeSession.id,
            remainingSeconds: currentRemaining,
            pausedAt: Date.now(),
          })
        )
      } catch {
        // Ignore localStorage error
      }
    }

    startTransition(async () => {
      try {
        await pausePomodoroSession({
          id: activeSession.id,
          remaining_seconds: currentRemaining,
        })
      } catch {
        // Offline or background network failure handled gracefully
      }
    })
  }, [activeSession, isPaused, remainingSeconds])

  // Resume Session
  const handleResumeSession = React.useCallback(() => {
    if (!activeSession || !isPaused) return
    const rem = pausedSeconds ?? remainingSeconds
    setPausedSeconds(null)

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`myos_focus_paused_${activeSession.id}`)
      } catch {
        // Ignore
      }
    }

    startTransition(async () => {
      try {
        const res = await resumePomodoroSession({
          id: activeSession.id,
          remaining_seconds: rem,
        })
        if (res.success && res.data) {
          setActiveSession((prev) => (prev ? { ...prev, ...res.data } : null))
        }
      } catch {
        // Network error handling
      }
    })
  }, [activeSession, isPaused, pausedSeconds, remainingSeconds])

  // Command palette and deep link listener for starting focus
  React.useEffect(() => {
    const handleStartEvent = () => {
      if (!activeSession) {
        handleStartSession("focus")
      }
    }

    window.addEventListener("myos:start-focus", handleStartEvent)

    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (params.get("start") === "true") {
          if (!activeSession) {
            handleStartSession("focus")
          }
          window.history.replaceState({}, "", window.location.pathname)
        }
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("myos:start-focus", handleStartEvent)
    }
  }, [activeSession, handleStartSession])

  // Cancel / Reset Session
  const handleResetSession = () => {
    setErrorMessage(null)
    if (!activeSession) return

    const sessionId = activeSession.id
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`myos_focus_paused_${sessionId}`)
      } catch {
        // Ignore
      }
    }
    setPausedSeconds(null)
    setActiveSession(null)

    startTransition(async () => {
      try {
        await cancelPomodoroSession(sessionId)
      } catch {
        // Ignored on reset
      }
    })
  }

  // Task Association Change
  const handleTaskSelect = (taskId: string | null) => {
    setSelectedTaskId(taskId)
    if (activeSession) {
      const taskTitle = initialData.availableTasks.find((t) => t.id === taskId)?.title || null
      setActiveSession((prev) => (prev ? { ...prev, task_id: taskId, task_title: taskTitle } : null))
      associateTaskWithSession(activeSession.id, taskId)
    }
  }

  // Quick Complete Task
  const handleMarkTaskComplete = async () => {
    if (!selectedTaskId) return
    try {
      await toggleTaskStatus(selectedTaskId, "todo")
      setSelectedTaskId(null)
      if (activeSession) {
        setActiveSession((prev) => (prev ? { ...prev, task_id: null, task_title: null } : null))
      }
    } catch {
      // Ignored
    }
  }

  const currentDuration = React.useMemo(() => {
    if (activeSession) return activeSession.duration_seconds
    if (selectedMode === "custom_focus") return customFocusMinutes * 60
    if (selectedMode === "custom_break") return customBreakMinutes * 60
    return POMODORO_MODES[selectedMode].durationSeconds
  }, [activeSession, selectedMode, customFocusMinutes, customBreakMinutes])

  const currentModeKey: PomodoroMode = activeSession
    ? derivePomodoroMode(activeSession.type, activeSession.duration_seconds)
    : selectedMode

  const activeCategory: "focus" | "break" =
    currentModeKey === "short_focus" ||
    currentModeKey === "long_focus" ||
    currentModeKey === "custom_focus"
      ? "focus"
      : "break"

  const isTabsDisabled = state === "FOCUSING" || state === "SHORT_BREAK" || state === "PAUSED"

  const handleSelectCategory = React.useCallback(
    (category: "focus" | "break") => {
      if (isTabsDisabled) return
      setErrorMessage(null)
      setActiveSession(null)
      if (category === "focus") {
        setSelectedMode(preferredFocusMode)
      } else {
        setSelectedMode(preferredBreakMode)
      }
    },
    [isTabsDisabled, preferredFocusMode, preferredBreakMode]
  )

  const handleSelectSubMode = React.useCallback(
    (mode: PomodoroMode) => {
      if (isTabsDisabled) return
      setErrorMessage(null)
      setActiveSession(null)
      setSelectedMode(mode)
      if (
        mode === "short_focus" ||
        mode === "long_focus" ||
        mode === "custom_focus"
      ) {
        setPreferredFocusMode(mode)
      } else {
        setPreferredBreakMode(mode)
      }
    },
    [isTabsDisabled]
  )

  return (
    <div className="flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto py-4 pb-16 w-full">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/40 font-mono text-xs text-muted-foreground mb-2">
          {state === "FOCUSING" || state === "SHORT_BREAK" ? (
            <Radio className="size-3 text-emerald-500 animate-pulse" />
          ) : state === "PAUSED" ? (
            <Pause className="size-3 text-amber-500" />
          ) : (
            <Timer className="size-5 text-amber-500" />
          )}
          {/* <span>Timestamp-Backed Pomodoro Engine</span> */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Focus Mode
        </h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          Deep work cycles with drift-free background and sleep resilience
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 p-3 text-xs rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-mono w-full max-w-lg animate-in fade-in-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Category Tabs: Focus vs Break with Short, Long & Custom Sub-Tabs */}
      <div className="w-full max-w-lg flex flex-col items-center gap-2.5">
        {/* Main Category Tabs: Only one can be selected at a time */}
        <div
          role="tablist"
          aria-label="Pomodoro mode categories"
          className="grid grid-cols-2 p-1 rounded-xl border border-border/70 bg-muted/40 text-xs font-mono w-full shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "focus"}
            disabled={isTabsDisabled}
            onClick={() => handleSelectCategory("focus")}
            className={cn(
              "py-2 px-3 rounded-lg transition-all font-medium select-none text-center flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[38px]",
              activeCategory === "focus"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              isTabsDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <Timer className="size-3.5" />
            <span>Focus</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "break"}
            disabled={isTabsDisabled}
            onClick={() => handleSelectCategory("break")}
            className={cn(
              "py-2 px-3 rounded-lg transition-all font-medium select-none text-center flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[38px]",
              activeCategory === "break"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              isTabsDisabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <Coffee className="size-3.5" />
            <span>Break</span>
          </button>
        </div>

        {/* Sub-tabs: Short vs Long vs Custom with respective durations */}
        <div
          role="tablist"
          aria-label={`${activeCategory === "focus" ? "Focus" : "Break"} duration sub-tabs`}
          className="grid grid-cols-3 p-1 rounded-lg border border-border/50 bg-muted/20 text-xs font-mono w-full max-w-md shadow-2xs"
        >
          {activeCategory === "focus" ? (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "short_focus"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("short_focus")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "short_focus"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Short</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({POMODORO_MODES.short_focus.durationMinutes}m)
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "long_focus"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("long_focus")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "long_focus"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Long</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({POMODORO_MODES.long_focus.durationMinutes}m)
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "custom_focus"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("custom_focus")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "custom_focus"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Custom</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({customFocusMinutes}m)
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "short_break"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("short_break")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "short_break"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Short</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({POMODORO_MODES.short_break.durationMinutes}m)
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "long_break"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("long_break")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "long_break"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Long</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({POMODORO_MODES.long_break.durationMinutes}m)
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentModeKey === "custom_break"}
                disabled={isTabsDisabled}
                onClick={() => handleSelectSubMode("custom_break")}
                className={cn(
                  "py-1.5 px-2 sm:px-3 rounded-md transition-all font-medium select-none text-center flex items-center justify-center gap-1 cursor-pointer touch-manipulation min-h-[32px]",
                  currentModeKey === "custom_break"
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  isTabsDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <span>Custom</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({customBreakMinutes}m)
                </span>
              </button>
            </>
          )}
        </div>

        {/* Custom Duration Configurator (Visible when Custom is selected) */}
        {((activeCategory === "focus" && currentModeKey === "custom_focus") ||
          (activeCategory === "break" && currentModeKey === "custom_break")) && (
          <div className="w-full max-w-md p-3 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs flex flex-col gap-2.5 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Sliders className="size-3.5 text-primary" />
                Configure {activeCategory === "focus" ? "Focus" : "Break"} Duration
              </span>
              <span className="text-[11px] text-muted-foreground">
                {activeCategory === "focus" ? "1 – 180 min" : "1 – 60 min"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Stepper with decrement / input / increment */}
              <div className="flex items-center gap-1 bg-muted/40 border border-border/60 rounded-lg p-1">
                <button
                  type="button"
                  aria-label="Decrease minutes"
                  disabled={
                    isTabsDisabled ||
                    (activeCategory === "focus" ? customFocusMinutes <= 1 : customBreakMinutes <= 1)
                  }
                  onClick={() =>
                    handleUpdateCustomMinutes(
                      (activeCategory === "focus" ? customFocusMinutes : customBreakMinutes) - 1,
                      activeCategory
                    )
                  }
                  className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Minus className="size-3.5" />
                </button>

                <div className="flex items-baseline gap-0.5 px-2">
                  <input
                    type="number"
                    min={1}
                    max={activeCategory === "focus" ? 180 : 60}
                    value={activeCategory === "focus" ? customFocusMinutes : customBreakMinutes}
                    disabled={isTabsDisabled}
                    onChange={(e) =>
                      handleUpdateCustomMinutes(parseInt(e.target.value, 10), activeCategory)
                    }
                    className="w-12 text-center bg-transparent font-mono font-bold text-sm text-foreground focus:outline-hidden tabular-nums"
                  />
                  <span className="text-xs font-mono text-muted-foreground">min</span>
                </div>

                <button
                  type="button"
                  aria-label="Increase minutes"
                  disabled={
                    isTabsDisabled ||
                    (activeCategory === "focus"
                      ? customFocusMinutes >= 180
                      : customBreakMinutes >= 60)
                  }
                  onClick={() =>
                    handleUpdateCustomMinutes(
                      (activeCategory === "focus" ? customFocusMinutes : customBreakMinutes) + 1,
                      activeCategory
                    )
                  }
                  className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 font-mono text-[11px]">
                {(activeCategory === "focus"
                  ? [15, 30, 45, 60, 90]
                  : [3, 10, 20, 30, 45]
                ).map((preset) => {
                  const currentVal =
                    activeCategory === "focus" ? customFocusMinutes : customBreakMinutes
                  const isSelected = currentVal === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isTabsDisabled}
                      onClick={() => handleUpdateCustomMinutes(preset, activeCategory)}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all cursor-pointer font-medium touch-manipulation",
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-2xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70",
                        isTabsDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {preset}m
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Timer Card */}
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-4 sm:p-8 shadow-xs flex flex-col items-center justify-center gap-4">
        {/* SVG Circular Countdown Display */}
        <PomodoroTimerDisplay
          state={state}
          remainingSeconds={remainingSeconds}
          durationSeconds={currentDuration}
          type={selectedType}
          taskTitle={activeSession?.task_title}
        />

        {/* Task Association Selector */}
        {selectedType === "focus" && (
          <div className="w-full flex flex-col items-center gap-1.5">
            <TaskAssociationSelector
              availableTasks={initialData.availableTasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleTaskSelect}
              disabled={state === "FOCUSING" || state === "PAUSED"}
            />

            {/* Quick Complete Task Button if active */}
            {selectedTaskId && (
              <button
                type="button"
                onClick={handleMarkTaskComplete}
                className="text-[11px] font-mono text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer mt-0.5"
              >
                <CheckCircle className="size-3" />
                <span>Mark task completed</span>
              </button>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-3">
          {state === "IDLE" && (
            <Button
              size="lg"
              disabled={isActionPending}
              onClick={() => handleStartSession(selectedMode)}
              className="gap-2 font-mono text-xs px-8 cursor-pointer shadow-xs"
            >
              <Play className="size-4 fill-current" />
              <span>
                {selectedMode === "custom_focus"
                  ? `Start Custom Focus (${customFocusMinutes}m)`
                  : selectedMode === "custom_break"
                  ? `Start Custom Break (${customBreakMinutes}m)`
                  : `Start ${POMODORO_MODES[selectedMode].label}`}
              </span>
            </Button>
          )}

          {(state === "FOCUSING" || state === "SHORT_BREAK") && (
            <div className="flex items-center gap-2">
              <Button
                size="lg"
                variant="secondary"
                disabled={isActionPending}
                onClick={handlePauseSession}
                className="gap-2 font-mono text-xs cursor-pointer shadow-xs border border-border/60 hover:bg-muted"
              >
                <Pause className="size-4" />
                <span>Pause</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isActionPending}
                onClick={handleResetSession}
                className="gap-2 font-mono text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:border-destructive/30"
              >
                <RotateCcw className="size-4" />
                <span>Stop Session</span>
              </Button>
            </div>
          )}

          {state === "PAUSED" && (
            <div className="flex items-center gap-2 animate-in fade-in-0">
              <Button
                size="lg"
                disabled={isActionPending}
                onClick={handleResumeSession}
                className="gap-2 font-mono text-xs px-6 cursor-pointer shadow-xs bg-amber-600 hover:bg-amber-500 text-white"
              >
                <Play className="size-4 fill-current" />
                <span>Resume {selectedType === "focus" ? "Focus" : "Break"}</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isActionPending}
                onClick={handleResetSession}
                className="gap-2 font-mono text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:border-destructive/30"
              >
                <RotateCcw className="size-4" />
                <span>Stop Session</span>
              </Button>
            </div>
          )}

          {state === "FOCUS_COMPLETE" && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                disabled={isActionPending}
                onClick={() => handleStartSession("short_break")}
                className="gap-2 font-mono text-xs cursor-pointer shadow-xs"
              >
                <Coffee className="size-4" />
                <span>Short Break (5m)</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isActionPending}
                onClick={() => handleStartSession("long_break")}
                className="gap-2 font-mono text-xs cursor-pointer"
              >
                <span>Long Break (15m)</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSession(null)}
                className="font-mono text-xs cursor-pointer"
              >
                Done
              </Button>
            </div>
          )}

          {state === "BREAK_COMPLETE" && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                disabled={isActionPending}
                onClick={() => handleStartSession("short_focus")}
                className="gap-2 font-mono text-xs cursor-pointer shadow-xs"
              >
                <Play className="size-4 fill-current" />
                <span>Short Focus (25m)</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={isActionPending}
                onClick={() => handleStartSession("long_focus")}
                className="gap-2 font-mono text-xs cursor-pointer"
              >
                <span>Long Focus (50m)</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSession(null)}
                className="font-mono text-xs cursor-pointer"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Daily Metrics & Session History */}
      <SessionStats
        completedSessions={completedSessions}
        totalFocusMinutes={totalFocusMinutes}
      />
    </div>
  )
}
