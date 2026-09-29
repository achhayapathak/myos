import {
  Settings,
  ShieldCheck,
  Globe,
  Keyboard,
  Moon,
  LogOut,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { logout } from "@/app/(auth)/actions"

export const metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          <Settings className="size-3.5" />
          <span>System & Preferences</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">
          MyOS Private Single-User Environment
        </p>
      </div>

      {/* Settings Grid */}
      <div className="flex flex-col gap-6">
        {/* Appearance Section */}
        <section className="p-5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Moon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Appearance</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Select your preferred color theme or synchronize with your operating system preference.
          </p>
          <div className="pt-1">
            <ThemeSelector />
          </div>
        </section>

        {/* Profile & Region */}
        <section className="p-5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Globe className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Profile & Localization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground">Display Name</label>
              <input
                type="text"
                defaultValue="Achhaya Pathak (Owner)"
                className="h-8 rounded-lg border border-border/60 bg-muted/20 px-3 text-xs font-mono text-foreground outline-hidden"
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground">Timezone</label>
              <input
                type="text"
                defaultValue="Asia/Kolkata (IST, UTC+05:30)"
                className="h-8 rounded-lg border border-border/60 bg-muted/20 px-3 text-xs font-mono text-foreground outline-hidden"
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Security & RLS Status */}
        <section className="p-5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Security & Architecture</h3>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
              RLS Strict Mode
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="text-[10px] text-muted-foreground uppercase">Access Model</div>
              <div className="font-semibold text-foreground mt-0.5">Single-User Private</div>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="text-[10px] text-muted-foreground uppercase">Public Registration</div>
              <div className="font-semibold text-foreground mt-0.5">Disabled</div>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="text-[10px] text-muted-foreground uppercase">Service Role Key</div>
              <div className="font-semibold text-emerald-500 mt-0.5">Server Only (Hidden)</div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold">Active Session</span>
              <span className="text-[11px] font-mono text-muted-foreground">Terminate session and clear browser credentials</span>
            </div>
            <form action={logout}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="gap-1.5 font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </Button>
            </form>
          </div>
        </section>

        {/* Keyboard Shortcuts Reference */}
        <section className="p-5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Keyboard className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Keyboard Navigation Shortcuts</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Open Command Palette</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Quick Task Creation</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌘N</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Jump to Today</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌥1</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Jump to Tasks</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌥2</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Jump to Focus</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌥3</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-muted-foreground">Jump to Notes</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[11px]">⌥4</kbd>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
