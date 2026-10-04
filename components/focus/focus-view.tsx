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

  const selectedType: PomodoroType = activeSession
    ? activeSession.type
    : POMODORO_MODES[selectedMode].type

  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(
    initialData.activeSession?.task_id || null
  )

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isActionPending, startTransition] = React.useTransition()

  const isSessionRunning = Boolean(activeSession && !activeSession.ended_at)

  // Subscribes to time ticks only when a session is active.
  // When idle, no timer is created, eliminating unnecessary React re-renders.
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
    const effectiveNow =
      currentTime > 0
        ? currentTime
        : activeSession
        ? new Date(activeSession.started_at).getTime()
        : 0

    if (!activeSession) {
      return {
        state: "IDLE" as PomodoroState,
        remainingSeconds: POMODORO_MODES[selectedMode].durationSeconds,
        isDone: false,
      }
    }

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
  }, [activeSession, currentTime, selectedMode])

  // Track if completion was already persisted to avoid duplicate network calls
  const completionHandledRef = React.useRef<string | null>(null)

  // Handle completion when time runs out
  React.useEffect(() => {
    if (!activeSession || !isDone || completionHandledRef.current === activeSession.id) {
      return
    }

    completionHandledRef.current = activeSession.id
    playChime()

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
    (target: PomodoroMode | PomodoroType = selectedMode) => {
      setErrorMessage(null)
      let modeToStart: PomodoroMode
      if (target === "focus") {
        modeToStart = selectedMode === "long_focus" ? "long_focus" : "short_focus"
      } else if (target === "short_break") {
        modeToStart = "short_break"
      } else if (target === "long_break") {
        modeToStart = "long_break"
      } else {
        modeToStart = target
      }

      const config = POMODORO_MODES[modeToStart]
      setSelectedMode(modeToStart)

      startTransition(async () => {
        try {
          const res = await startPomodoroSession({
            type: config.type,
            duration_seconds: config.durationSeconds,
            task_id: config.type === "focus" ? selectedTaskId : null,
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
    [initialData.availableTasks, selectedTaskId, selectedMode]
  )

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

  const currentDuration = activeSession
    ? activeSession.duration_seconds
    : POMODORO_MODES[selectedMode].durationSeconds

  return (
    <div className="flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto py-4 pb-16 w-full">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/40 font-mono text-xs text-muted-foreground mb-2">
          {state === "FOCUSING" || state === "SHORT_BREAK" ? (
            <Radio className="size-3 text-emerald-500 animate-pulse" />
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

      {/* Mode Selector Tabs (only clickable in IDLE or when complete) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl border border-border/60 bg-muted/30 text-xs font-mono w-full max-w-lg">
        {((["short_focus", "long_focus", "short_break", "long_break"] as const)).map((modeKey) => {
          const config = POMODORO_MODES[modeKey]
          const isSelected = selectedMode === modeKey && !activeSession
          const isCurrentRunning =
            activeSession &&
            derivePomodoroMode(activeSession.type, activeSession.duration_seconds) === modeKey

          return (
            <button
              key={modeKey}
              type="button"
              disabled={state === "FOCUSING" || state === "SHORT_BREAK"}
              onClick={() => {
                setSelectedMode(modeKey)
                setActiveSession(null)
              }}
              className={cn(
                "py-2 px-1.5 rounded-lg transition-all cursor-pointer font-medium select-none text-center touch-manipulation min-h-[38px] flex items-center justify-center gap-1",
                isSelected || isCurrentRunning
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                (state === "FOCUSING" || state === "SHORT_BREAK") && "opacity-60 cursor-not-allowed"
              )}
            >
              <span>{config.label}</span>
              <span className="text-[10px] opacity-75">{config.durationMinutes}m</span>
            </button>
          )
        })}
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
              disabled={state === "FOCUSING"}
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
              <span>Start {POMODORO_MODES[selectedMode].label}</span>
            </Button>
          )}

          {(state === "FOCUSING" || state === "SHORT_BREAK") && (
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
