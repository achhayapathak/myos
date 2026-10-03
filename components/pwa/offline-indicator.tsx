"use client"

import * as React from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsOnline } from "./pwa-provider"

export function OfflineIndicator() {
  const isOnline = useIsOnline()
  const [retrying, setRetrying] = React.useState(false)

  if (isOnline) {
    return null
  }

  const handleRetry = () => {
    setRetrying(true)
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground shadow-lg border border-destructive-foreground/20 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[calc(100%-2rem)]"
    >
      <div className="flex items-center gap-2 truncate">
        <WifiOff className="size-3.5 shrink-0 animate-pulse" />
        <span className="truncate">
          You&apos;re offline — database changes require connection
        </span>
      </div>

      <Button
        variant="secondary"
        size="xs"
        onClick={handleRetry}
        disabled={retrying}
        className="h-6 px-2 text-[11px] font-mono shrink-0 gap-1 rounded-full bg-background text-foreground hover:bg-muted"
      >
        <RefreshCw className={`size-2.5 ${retrying ? "animate-spin" : ""}`} />
        <span>Retry</span>
      </Button>
    </div>
  )
}
