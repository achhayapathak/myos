"use client"

import * as React from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("Global application error:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-6 rounded-2xl border border-neutral-800 bg-neutral-900 text-center">
          <h2 className="text-lg font-bold mb-2">Critical Application Error</h2>
          <p className="text-xs text-neutral-400 font-mono mb-4">
            {error.message || "An unrecoverable error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold hover:bg-neutral-200 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
