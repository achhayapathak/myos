import Link from "next/link"
import { Home, Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/layout/brand-logo"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      <BrandLogo className="size-12 rounded-2xl shadow-sm mb-6" />

      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 font-mono text-xs text-muted-foreground mb-4">
        <span>404</span>
        <span className="text-border">/</span>
        <span>ROUTE_NOT_FOUND</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Page does not exist
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        The requested path could not be found. Use the command palette or return to the main dashboard.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/today"
          className={cn(buttonVariants({ size: "default" }), "gap-2 font-mono text-xs")}
        >
          <Home className="size-4" />
          <span>Return to Today</span>
        </Link>
      </div>

      <p className="mt-8 text-xs font-mono text-muted-foreground/60 flex items-center gap-1.5">
        <Search className="size-3" />
        <span>Tip: Press ⌘K anywhere in MyOS to open the command palette</span>
      </p>
    </div>
  )
}
