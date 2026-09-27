"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log the error to console for developer inspection
    console.error("Application error captured by boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-md mx-auto">
      <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="size-6" />
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">
        Something went wrong
      </h2>
      <p className="text-xs text-muted-foreground font-mono mb-4 break-all max-w-sm">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>

      {error.digest && (
        <span className="text-[10px] font-mono text-muted-foreground/60 mb-6 px-2 py-1 rounded bg-muted">
          Digest: {error.digest}
        </span>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => reset()}
          className="gap-1.5 font-mono text-xs"
        >
          <RotateCcw className="size-3.5" />
          <span>Try again</span>
        </Button>
        <Link
          href="/today"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5 font-mono text-xs")}
        >
          <Home className="size-3.5" />
          <span>Go to Today</span>
        </Link>
      </div>
    </div>
  )
}
