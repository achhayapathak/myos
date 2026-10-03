"use client"

import * as React from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePWA } from "./pwa-provider"

export function InstallPrompt() {
  const { isInstallable, promptInstall } = usePWA()
  const [dismissed, setDismissed] = React.useState(false)

  if (!isInstallable || dismissed) {
    return null
  }

  const handleInstall = async () => {
    await promptInstall()
  }

  return (
    <aside
      aria-label="PWA Installation Notice"
      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 text-xs text-foreground mb-4 shadow-2xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Download className="size-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">Install MyOS App</span>
          <span className="text-[11px] font-mono text-muted-foreground">
            Fast standalone access on your mobile or desktop device
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="xs"
          onClick={handleInstall}
          className="gap-1.5 font-mono text-[11px] h-7"
        >
          <Download className="size-3" />
          <span>Install</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss installation prompt"
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </aside>
  )
}
