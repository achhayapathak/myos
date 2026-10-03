"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted) {
    return <div className="h-10 w-full rounded-lg bg-muted/40 animate-pulse" />
  }

  const options = [
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
    { label: "System", value: "system", icon: Monitor },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = theme === opt.value

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center justify-center gap-2 min-h-[40px] py-2 px-3 rounded-lg border text-xs font-mono transition-all touch-manipulation cursor-pointer active:scale-95",
              isSelected
                ? "border-foreground bg-foreground text-background font-semibold shadow-xs"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
