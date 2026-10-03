"use client"

import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

interface PWAContextType {
  isOnline: boolean
  isInstallable: boolean
  isInstalled: boolean
  promptInstall: () => Promise<boolean>
}

const PWAContext = React.createContext<PWAContextType>({
  isOnline: true,
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => false,
})

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function useIsOnline() {
  return React.useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true // SSR safe default
  )
}

function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)")
  mql.addEventListener("change", callback)
  window.addEventListener("appinstalled", callback)
  return () => {
    mql.removeEventListener("change", callback)
    window.removeEventListener("appinstalled", callback)
  }
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function useIsStandalone() {
  return React.useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false
  )
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useIsOnline()
  const isStandalone = useIsStandalone()
  const [installPromptEvent, setInstallPromptEvent] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [installedViaPrompt, setInstalledViaPrompt] = React.useState(false)

  const isInstalled = isStandalone || installedViaPrompt

  // Register service worker and handle beforeinstallprompt
  React.useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Service Worker Registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    // New update available
                    installingWorker.postMessage({ type: "SKIP_WAITING" })
                  }
                }
              }
            }
          }
        })
        .catch((error) => {
          console.warn("Service worker registration skipped or failed:", error)
        })
    }

    // 2. Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPromptEvent(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstalledViaPrompt(true)
      setInstallPromptEvent(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = React.useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent) return false

    try {
      await installPromptEvent.prompt()
      const choice = await installPromptEvent.userChoice
      if (choice.outcome === "accepted") {
        setInstalledViaPrompt(true)
        setInstallPromptEvent(null)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [installPromptEvent])

  const value = React.useMemo(
    () => ({
      isOnline,
      isInstallable: Boolean(installPromptEvent) && !isInstalled,
      isInstalled,
      promptInstall,
    }),
    [isOnline, installPromptEvent, isInstalled, promptInstall]
  )

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>
}

export function usePWA() {
  return React.useContext(PWAContext)
}
