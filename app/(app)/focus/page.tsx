import {
  Timer,
  Play,
  RotateCcw,
  Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Focus",
}

export default function FocusPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 max-w-xl mx-auto py-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 font-mono text-xs text-muted-foreground mb-2">
          <Timer className="size-3.5 text-amber-500" />
          <span>Pomodoro Session Engine</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Focus Mode
        </h2>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          Deep work cycles with persistent timestamp tracking
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-muted/30 text-xs font-mono">
        <button
          type="button"
          className="px-4 py-1.5 rounded-lg bg-foreground text-background font-semibold shadow-xs"
        >
          Focus (25m)
        </button>
        <button
          type="button"
          className="px-4 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Short Break (5m)
        </button>
        <button
          type="button"
          className="px-4 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Long Break (15m)
        </button>
      </div>

      {/* Timer Card */}
      <div className="w-full rounded-2xl border border-border/70 bg-card p-8 md:p-12 shadow-xs flex flex-col items-center justify-center gap-6">
        <div className="text-6xl md:text-7xl font-mono font-bold tracking-tighter text-foreground tabular-nums">
          25:00
        </div>

        {/* Task association placeholder */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs font-mono text-muted-foreground">
          <span>Active Task:</span>
          <span className="font-semibold text-foreground">Finish payment implementation</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-2">
          <Button size="lg" className="gap-2 font-mono text-xs px-6">
            <Play className="size-4 fill-current" />
            <span>Start Session</span>
          </Button>
          <Button variant="outline" size="lg" className="gap-2 font-mono text-xs">
            <RotateCcw className="size-4" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Daily Stats Summary */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono text-foreground">3</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Completed</div>
        </div>
        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono text-foreground">75m</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Focused Time</div>
        </div>
        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
          <div className="text-lg font-bold font-mono text-foreground flex items-center justify-center gap-1">
            <Flame className="size-4 text-amber-500" />
            <span>4d</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Streak</div>
        </div>
      </div>
    </div>
  )
}
