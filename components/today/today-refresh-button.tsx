"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TodayRefreshButtonProps {
  className?: string
}

export function TodayRefreshButton({ className }: TodayRefreshButtonProps) {
  const [isSpinning, setIsSpinning] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  // Safely retrieve router if within AppRouterContext (handles test / SSR environments)
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    router = null
  }

  const handleRefresh = (e?: React.MouseEvent) => {
    setIsSpinning(true)

    // Hard reload on Shift+Click or when Next router is not available
    if (e?.shiftKey || !router) {
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      return
    }

    startTransition(() => {
      router.refresh()
    })

    // Maintain spinning animation for at least 600ms for tactile feedback
    setTimeout(() => {
      setIsSpinning(false)
    }, 600)
  }

  const isRefreshing = isPending || isSpinning

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label="Refresh page"
      title="Refresh page (Shift+Click for hard reload)"
      className={cn(
        "gap-1.5 text-xs font-mono min-h-[36px] sm:min-h-0 px-3 touch-manipulation cursor-pointer",
        className
      )}
    >
      <RefreshCw
        className={cn(
          "size-3.5 shrink-0 transition-transform duration-500",
          isRefreshing && "animate-spin text-primary"
        )}
      />
      <span>Refresh</span>
    </Button>
  )
}
