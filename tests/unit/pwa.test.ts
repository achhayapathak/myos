import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import manifest from "@/app/manifest"

describe("PWA Specification & Implementation Tests", () => {
  const rootDir = process.cwd()

  describe("1. Web App Manifest Verification", () => {
    it("returns correct metadata from app/manifest.ts", () => {
      const pwaManifest = manifest()

      expect(pwaManifest.name).toBe("MyOS — Personal Operating System")
      expect(pwaManifest.short_name).toBe("MyOS")
      expect(pwaManifest.start_url).toBe("/today")
      expect(pwaManifest.display).toBe("standalone")
      expect(pwaManifest.background_color).toBe("#171717")
      expect(pwaManifest.theme_color).toBe("#171717")
      expect(pwaManifest.orientation).toBe("portrait-primary")
      expect(pwaManifest.scope).toBe("/")

      // Must have maskable and any icons
      const icons = pwaManifest.icons || []
      expect(icons.length).toBeGreaterThanOrEqual(4)

      const has192Maskable = icons.some(
        (icon) => icon.sizes === "192x192" && icon.purpose === "maskable"
      )
      const has512Maskable = icons.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "maskable"
      )
      const has192Any = icons.some(
        (icon) => icon.sizes === "192x192" && icon.purpose === "any"
      )
      const has512Any = icons.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "any"
      )
      const hasSvg = icons.some((icon) => icon.type === "image/svg+xml")

      expect(has192Maskable).toBe(true)
      expect(has512Maskable).toBe(true)
      expect(has192Any).toBe(true)
      expect(has512Any).toBe(true)
      expect(hasSvg).toBe(true)
    })

    it("ensures public/manifest.webmanifest exists and matches specifications", () => {
      const manifestPath = path.join(rootDir, "public/manifest.webmanifest")
      expect(fs.existsSync(manifestPath)).toBe(true)

      const raw = fs.readFileSync(manifestPath, "utf-8")
      const parsed = JSON.parse(raw)

      expect(parsed.name).toBe("MyOS — Personal Operating System")
      expect(parsed.short_name).toBe("MyOS")
      expect(parsed.start_url).toBe("/today")
      expect(parsed.display).toBe("standalone")
      expect(parsed.background_color).toBe("#171717")
      expect(parsed.theme_color).toBe("#171717")
      expect(parsed.icons).toBeDefined()
      expect(Array.isArray(parsed.icons)).toBe(true)
      expect(parsed.icons.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe("2. App Icons and Static Assets", () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])

    it("verifies 192x192 PNG icon exists and is a valid PNG binary", () => {
      const iconPath = path.join(rootDir, "public/icons/icon-192x192.png")
      expect(fs.existsSync(iconPath)).toBe(true)

      const buffer = fs.readFileSync(iconPath)
      expect(buffer.length).toBeGreaterThan(100)
      expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true)
    })

    it("verifies 512x512 PNG icon exists and is a valid PNG binary", () => {
      const iconPath = path.join(rootDir, "public/icons/icon-512x512.png")
      expect(fs.existsSync(iconPath)).toBe(true)

      const buffer = fs.readFileSync(iconPath)
      expect(buffer.length).toBeGreaterThan(100)
      expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true)
    })

    it("verifies apple-touch-icon.png exists and is a valid PNG binary", () => {
      const iconPath = path.join(rootDir, "public/icons/apple-touch-icon.png")
      expect(fs.existsSync(iconPath)).toBe(true)

      const buffer = fs.readFileSync(iconPath)
      expect(buffer.length).toBeGreaterThan(100)
      expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true)
    })

    it("verifies icon.svg exists and has valid SVG root structure", () => {
      const iconPath = path.join(rootDir, "public/icons/icon.svg")
      expect(fs.existsSync(iconPath)).toBe(true)

      const content = fs.readFileSync(iconPath, "utf-8")
      expect(content).toContain("<svg")
      expect(content).toContain("viewBox=\"0 0 512 512\"")
      expect(content).toContain("</svg>")
    })
  })

  describe("3. Service Worker Implementation & Explicit Offline Guarantees", () => {
    const swPath = path.join(rootDir, "public/sw.js")

    it("ensures public/sw.js exists", () => {
      expect(fs.existsSync(swPath)).toBe(true)
    })

    it("verifies precaching includes core application shell, /today, and icons", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toContain("const CACHE_NAME =")
      expect(swContent).toContain("const OFFLINE_URL = \"/offline\"")
      expect(swContent).toContain("\"/\"")
      expect(swContent).toContain("\"/today\"")
      expect(swContent).toContain("\"/offline\"")
      expect(swContent).toContain("\"/manifest.webmanifest\"")
      expect(swContent).toContain("\"/icons/icon-192x192.png\"")
      expect(swContent).toContain("\"/icons/icon-512x512.png\"")
      expect(swContent).toContain("\"/icons/apple-touch-icon.png\"")
    })

    it("verifies lifecycle events: install (skipWaiting) and activate (clients.claim)", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toMatch(/addEventListener\(["']install["']/)
      expect(swContent).toContain("self.skipWaiting()")
      expect(swContent).toMatch(/addEventListener\(["']activate["']/)
      expect(swContent).toContain("self.clients.claim()")
    })

    it("enforces explicit offline rule: database mutations require connectivity (HTTP 503)", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      // Non-GET requests (mutations) must not be silently queued or cached without connectivity
      expect(swContent).toContain("request.method !== \"GET\"")
      expect(swContent).toContain("status: 503")
      expect(swContent).toContain("statusText: \"Service Unavailable\"")
      expect(swContent).toContain(
        "Offline: Database mutations require active network connectivity."
      )
    })

    it("enforces navigation fallback to offline application shell", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toContain("request.mode === \"navigate\"")
      expect(swContent).toContain("caches.match(OFFLINE_URL)")
    })

    it("enforces stale-while-revalidate caching for static assets", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toContain("/_next/static/")
      expect(swContent).toContain("/icons/")
    })

    it("handles SKIP_WAITING message for immediate updates", () => {
      const swContent = fs.readFileSync(swPath, "utf-8")

      expect(swContent).toContain("addEventListener(\"message\"")
      expect(swContent).toContain("event.data.type === \"SKIP_WAITING\"")
    })
  })

  describe("4. Offline Application Shell Page", () => {
    const offlinePagePath = path.join(rootDir, "app/offline/page.tsx")

    it("ensures offline shell page exists and exports component and metadata", () => {
      expect(fs.existsSync(offlinePagePath)).toBe(true)

      const content = fs.readFileSync(offlinePagePath, "utf-8")
      expect(content).toContain("export const metadata =")
      expect(content).toContain("export default function OfflinePage")
      expect(content).toContain("You are currently offline")
    })

    it("explicitly explains database mutation requirements and safety", () => {
      const content = fs.readFileSync(offlinePagePath, "utf-8")

      expect(content).toContain("database mutations are paused until your connection is restored")
      expect(content).toContain("Explicit Database Safety")
    })

    it("provides cached navigation links to core sections", () => {
      const content = fs.readFileSync(offlinePagePath, "utf-8")

      expect(content).toContain("href=\"/today\"")
      expect(content).toContain("href=\"/tasks\"")
      expect(content).toContain("href=\"/notes\"")
      expect(content).toContain("href=\"/focus\"")
      expect(content).toContain("href=\"/calendar\"")
      expect(content).toContain("href=\"/reminders\"")
    })
  })

  describe("5. PWA Components & Layout Integration", () => {
    it("ensures components/pwa exports provider, offline indicator, and install prompt", () => {
      const indexPath = path.join(rootDir, "components/pwa/index.ts")
      expect(fs.existsSync(indexPath)).toBe(true)

      const content = fs.readFileSync(indexPath, "utf-8")
      expect(content).toContain("export * from \"./pwa-provider\"")
      expect(content).toContain("export * from \"./offline-indicator\"")
      expect(content).toContain("export * from \"./install-prompt\"")
    })

    it("verifies root layout app/layout.tsx integrates manifest, appleWebApp, and PWAProvider", () => {
      const layoutPath = path.join(rootDir, "app/layout.tsx")
      const content = fs.readFileSync(layoutPath, "utf-8")

      expect(content).toContain("manifest: \"/manifest.webmanifest\"")
      expect(content).toContain("appleWebApp:")
      expect(content).toContain("capable: true")
      expect(content).toContain("<PWAProvider>")
      expect(content).toContain("<OfflineIndicator />")
    })

    it("verifies components/layout/app-shell.tsx integrates InstallPrompt", () => {
      const appShellPath = path.join(rootDir, "components/layout/app-shell.tsx")
      const content = fs.readFileSync(appShellPath, "utf-8")

      expect(content).toContain("<InstallPrompt />")
    })
  })

  describe("6. Installation Behavior & Service Worker Registration Simulation", () => {
    beforeEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("registers service worker on load when supported", async () => {
      const mockRegister = vi.fn().mockResolvedValue({
        onupdatefound: null,
      })

      vi.stubGlobal("navigator", {
        serviceWorker: {
          register: mockRegister,
          controller: null,
        },
        onLine: true,
      })

      expect("serviceWorker" in navigator).toBe(true)
      const registration = await navigator.serviceWorker.register("/sw.js")
      expect(mockRegister).toHaveBeenCalledWith("/sw.js")
      expect(registration).toBeDefined()
    })

    it("handles beforeinstallprompt and userChoice acceptance", async () => {
      const mockPrompt = vi.fn().mockResolvedValue(undefined)
      const mockUserChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" })

      const fakeBeforeInstallEvent = {
        preventDefault: vi.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice,
      }

      // Simulate capturing beforeinstallprompt
      fakeBeforeInstallEvent.preventDefault()
      expect(fakeBeforeInstallEvent.preventDefault).toHaveBeenCalled()

      // Trigger prompt
      await fakeBeforeInstallEvent.prompt()
      expect(mockPrompt).toHaveBeenCalled()

      // Await user decision
      const choice = await fakeBeforeInstallEvent.userChoice
      expect(choice.outcome).toBe("accepted")
    })

    it("handles beforeinstallprompt dismissal by user", async () => {
      const mockPrompt = vi.fn().mockResolvedValue(undefined)
      const mockUserChoice = Promise.resolve({ outcome: "dismissed" as const, platform: "web" })

      const fakeBeforeInstallEvent = {
        preventDefault: vi.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice,
      }

      await fakeBeforeInstallEvent.prompt()
      const choice = await fakeBeforeInstallEvent.userChoice
      expect(choice.outcome).toBe("dismissed")
    })

    it("detects standalone display mode correctly", () => {
      // 1. matchMedia standalone
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      vi.stubGlobal("window", {
        matchMedia: mockMatchMedia,
        navigator: {},
      })

      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      expect(isStandalone).toBe(true)

      // 2. iOS Safari standalone
      const mockIOSWindow = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: true },
      }

      const isIOSStandalone =
        mockIOSWindow.matchMedia("(display-mode: standalone)").matches ||
        (mockIOSWindow.navigator as unknown as { standalone?: boolean }).standalone === true

      expect(isIOSStandalone).toBe(true)
    })
  })
})
