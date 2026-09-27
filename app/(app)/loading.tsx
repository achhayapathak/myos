export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse w-full max-w-4xl" aria-label="Loading content">
      {/* Top Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-6 w-36 rounded-md bg-muted/80" />
        <div className="h-4 w-64 rounded-md bg-muted/50" />
      </div>

      {/* Main card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-muted/80" />
            <div className="h-4 w-12 rounded bg-muted/60" />
          </div>
          <div className="space-y-2.5 mt-2">
            <div className="h-8 rounded-lg bg-muted/60 w-full" />
            <div className="h-8 rounded-lg bg-muted/40 w-full" />
            <div className="h-8 rounded-lg bg-muted/30 w-full" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-muted/80" />
            <div className="h-4 w-14 rounded bg-muted/60" />
          </div>
          <div className="h-28 rounded-lg bg-muted/40 flex items-center justify-center">
            <div className="h-10 w-24 rounded bg-muted/60" />
          </div>
        </div>
      </div>

      {/* Bottom list skeleton */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col gap-3">
        <div className="h-4 w-32 rounded bg-muted/80" />
        <div className="space-y-2 mt-2">
          <div className="h-6 rounded bg-muted/50 w-3/4" />
          <div className="h-6 rounded bg-muted/40 w-1/2" />
        </div>
      </div>
    </div>
  )
}
