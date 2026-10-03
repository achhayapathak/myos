"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("Root application error captured by boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 border border-destructive/20">
        <AlertCircle className="size-6" />
      </div>

      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 font-mono text-xs text-muted-foreground mb-4">
        <span>500</span>
        <span className="text-border">/</span>
        <span>APPLICATION_ERROR</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-4 font-mono">
        {error.message || "An unexpected error occurred while processing your request."}
      </p>

      {error.digest && (
        <span className="text-[10px] font-mono text-muted-foreground/60 mb-6 px-2 py-1 rounded bg-muted border border-border/40">
          Digest: {error.digest}
        </span>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={() => reset()}
          className="gap-2 font-mono text-xs"
        >
          <RotateCcw className="size-4" />
          <span>Try again</span>
        </Button>
        <Link
          href="/today"
          className={cn(buttonVariants({ size: "default" }), "gap-2 font-mono text-xs")}
        >
          <Home className="size-4" />
          <span>Return to Today</span>
        </Link>
      </div>
    </div>
  )
}
