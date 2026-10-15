import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { getCurrentUser } from "@/lib/supabase/auth"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { ScreenshotShowcase } from "@/components/landing/screenshot-showcase"
import {
  Sun,
  CheckSquare,
  FileText,
  Flame,
  Activity,
  Bell,
  ArrowRight,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myos.app"

  return {
    title: "MyOS — Private, Invite-Only Personal Workspace",
    description:
      "A minimal, private workspace designed to help you organize daily tasks, capture thoughts, run focus sessions, and build routines — available exclusively by personal invitation.",
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: "MyOS — Private, Invite-Only Personal Workspace",
      description:
        "A private, single-user workspace for tasks, notes, habits, and deep work. Zero tracking, zero ads, available exclusively by invitation.",
      url: siteUrl,
      siteName: "MyOS",
      images: [
        {
          url: `${siteUrl}/images/myos/today.png`,
          width: 1440,
          height: 900,
          alt: "MyOS Today Dashboard preview",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "MyOS — Private, Invite-Only Personal Workspace",
      description:
        "A private, single-user workspace for tasks, notes, habits, and deep work. Available exclusively by invitation.",
      images: [`${siteUrl}/images/myos/today.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function LandingPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-[#090909] text-neutral-200 antialiased selection:bg-neutral-800 selection:text-white">
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-50 border-b border-neutral-850 bg-[#090909]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & status */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-white hover:text-neutral-300 transition-colors"
              aria-label="MyOS Home"
            >
              <div className="size-7 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-xs font-semibold text-neutral-200 shadow-inner">
                M
              </div>
              <span className="font-semibold text-base tracking-tight text-white">
                MyOS
              </span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border border-neutral-750 bg-neutral-900/90 text-neutral-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              PRIVATE · INVITE ONLY
            </span>
          </div>

          {/* Nav links & CTA */}
          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <div className="hidden md:flex items-center gap-6 text-neutral-400">
              <a
                href="#workspace"
                className="hover:text-white transition-colors"
              >
                Workspace
              </a>
              <a
                href="#features"
                className="hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#philosophy"
                className="hover:text-white transition-colors"
              >
                Philosophy
              </a>
            </div>

            {user ? (
              <Link
                href="/today"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white transition-colors"
              >
                <span>Go to App</span>
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-neutral-400 hover:text-white text-xs sm:text-sm px-2.5 py-1.5 transition-colors"
                >
                  Sign in
                </Link>
                <a
                  href="#invite"
                  className="hidden sm:inline-flex items-center rounded-lg bg-neutral-100 hover:bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-black transition-colors"
                >
                  Request invitation
                </a>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-neutral-850 overflow-hidden">
          {/* Subtle grid background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
            aria-hidden="true"
          />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & Waitlist */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-medium tracking-wider text-neutral-400 uppercase">
                    PRIVATE SINGLE-USER WORKSPACE
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.12]">
                  Your day.
                  <br />
                  Your focus.
                  <br />
                  <span className="text-neutral-400">Your system.</span>
                </h1>

                <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-xl">
                  A minimal, single-user workspace for tasks, notes, habits, and deep work.
                  No noise, no feeds, and no subscription bloat — operated exclusively by personal invitation.
                </p>

                {/* Hero Waitlist Form */}
                <div className="pt-2 max-w-md" id="hero-waitlist">
                  <div className="rounded-xl border border-neutral-800 bg-[#141414]/90 p-3 sm:p-4 shadow-xl shadow-black/30">
                    <WaitlistForm
                      buttonText="Request an invitation"
                      id="hero"
                    />
                  </div>
                </div>

                {/* Subdued micro details */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2 text-xs text-neutral-500 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Single-user private architecture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                    <span>Strict invitation access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                    <span>Zero telemetry or tracking</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Screenshot Preview */}
              <div className="lg:col-span-6">
                <div className="relative rounded-xl border border-neutral-800 bg-[#141414] shadow-2xl shadow-black/60 overflow-hidden group">
                  {/* Window Chrome Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-800 bg-[#0f0f0f]">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-neutral-700" />
                      <span className="size-2.5 rounded-full bg-neutral-700" />
                      <span className="size-2.5 rounded-full bg-neutral-700" />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500">
                      myos.app/today
                    </span>
                    <div className="w-12" />
                  </div>

                  {/* Screenshot Image */}
                  <div className="relative aspect-[16/10] sm:aspect-[16/10] w-full overflow-hidden bg-neutral-950">
                    <Image
                      src="/images/myos/today-preview.png"
                      alt="MyOS Today dashboard showing clock, daily priorities, Pomodoro timer, and upcoming reminders"
                      width={1440}
                      height={900}
                      priority
                      className="w-full h-auto object-cover object-top"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 text-center mt-3 font-mono">
                  The Today dashboard — quiet, intentional, single-screen clarity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Product Workspace Showcase */}
        <section id="workspace" className="py-20 md:py-28 border-b border-neutral-850">
          <div id="preview" className="sr-only" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-mono font-medium tracking-wider text-neutral-400 uppercase">
                THE WORKSPACE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Inside the private system
              </h2>
              <p className="text-sm sm:text-base text-neutral-400">
                A cohesive set of tools engineered to work seamlessly together in one fast, quiet interface.
              </p>
            </div>

            <ScreenshotShowcase />
          </div>
        </section>

        {/* 4. Features Section */}
        <section id="features" className="py-20 md:py-28 border-b border-neutral-850">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-16 space-y-3">
              <span className="text-xs font-mono font-medium tracking-wider text-neutral-400 uppercase">
                CAPABILITIES
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Focused tools for your daily workflow
              </h2>
              <p className="text-sm sm:text-base text-neutral-400">
                Purpose-built modules that eliminate context switching without adding bloat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1: Today */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <Sun className="size-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Today
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Know what matters when you open the app. See your tasks,
                      reminders, upcoming events, and focus session in one place.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Single morning dashboard</span>
                </div>
              </div>

              {/* Feature 2: Tasks */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <CheckSquare className="size-4 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Tasks
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Capture tasks quickly, set priorities, and keep track of
                      what needs to get done without bureaucratic overhead.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Fast capture & priorities</span>
                </div>
              </div>

              {/* Feature 3: Notes */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <FileText className="size-4 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Notes
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Keep ideas, technical notes, and meeting takeaways in a
                      minimal Markdown-friendly workspace with password protection.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Markdown & encrypted lock</span>
                </div>
              </div>

              {/* Feature 4: Focus */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <Flame className="size-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Focus
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Use Pomodoro sessions to create deliberate periods of
                      uninterrupted work with pause controls and distraction tracking.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Pomodoro & deep work</span>
                </div>
              </div>

              {/* Feature 5: Habits */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <Activity className="size-4 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Habits
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Track recurring behaviors, monitor consistency, and build
                      routines over time with heatmaps and streak indicators.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Consistency & streaks</span>
                </div>
              </div>

              {/* Feature 6: Calendar and reminders */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 flex flex-col justify-between transition-colors hover:border-neutral-700">
                <div className="space-y-4">
                  <div className="size-9 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300">
                    <Bell className="size-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1.5">
                      Calendar and reminders
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Keep commitments and important follow-ups visible with Web
                      Push notifications instead of relying on memory.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center text-xs font-mono text-neutral-500">
                  <span>Push alerts & scheduling</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Design Philosophy Section */}
        <section id="philosophy" className="py-20 md:py-28 border-b border-neutral-850">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
              <span className="text-xs font-mono font-medium tracking-wider text-neutral-400 uppercase">
                DESIGN PRINCIPLES
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Built to stay out of your way.
              </h2>
              <p className="text-sm sm:text-base text-neutral-400">
                Most software demands more attention than the work it manages.
                MyOS adheres to three private computing principles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Principle 1 */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 space-y-3">
                <div className="size-8 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300 font-mono text-xs">
                  01
                </div>
                <h3 className="text-base font-medium text-white">
                  Minimal by default
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  A quiet interface with zero visual noise, so the next action is obvious.
                  No banners, promotional badges, or gamified distractions.
                </p>
              </div>

              {/* Principle 2 */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 space-y-3">
                <div className="size-8 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300 font-mono text-xs">
                  02
                </div>
                <h3 className="text-base font-medium text-white">
                  Keyboard-first speed
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Shortcuts and instant capture eliminate friction.
                  Capture thoughts, switch modules, and complete tasks without touching the mouse.
                </p>
              </div>

              {/* Principle 3 */}
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-6 space-y-3">
                <div className="size-8 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-neutral-300 font-mono text-xs">
                  03
                </div>
                <h3 className="text-base font-medium text-white">
                  Private & sovereign
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Your workspace is yours alone. Single-user isolation with PostgreSQL Row Level
                  Security, zero telemetry, and no ad monetization.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Invite-Only Positioning & Access Request */}
        <section id="invite" className="py-20 md:py-28 relative">
          <div id="waitlist" className="sr-only" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border border-neutral-800 bg-[#141414] text-neutral-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              RESTRICTED ACCESS
            </span>

            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Private by design. Invitation only.
            </h2>

            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed max-w-xl mx-auto">
              MyOS is intentionally not a mass-market SaaS tool or a public subscription service.
              It is maintained as a focused, single-user system for individuals who require calm,
              uncompromised execution. Membership is granted exclusively through personal invitations.
            </p>

            <div className="pt-4 max-w-md mx-auto text-left">
              <div className="rounded-xl border border-neutral-800 bg-[#141414] p-4 sm:p-5 shadow-2xl shadow-black/40">
                <WaitlistForm
                  buttonText="Request an invitation"
                  id="cta"
                />
              </div>
            </div>

            <p className="text-xs text-neutral-500 font-mono pt-4">
              Private single-user workspace. Strict Row Level Security. Zero third-party telemetry.
            </p>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-neutral-850 bg-[#090909] py-12 text-sm text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-[10px] font-semibold text-neutral-300">
                M
              </div>
              <span className="font-semibold text-white tracking-tight">
                MyOS
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              A private, single-user productivity workspace.
            </p>
            <p className="text-xs text-neutral-600 font-mono">
              © {new Date().getFullYear()} MyOS. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <a
              href="#workspace"
              className="hover:text-neutral-200 transition-colors"
            >
              Workspace
            </a>
            <a
              href="#features"
              className="hover:text-neutral-200 transition-colors"
            >
              Features
            </a>
            <a
              href="#philosophy"
              className="hover:text-neutral-200 transition-colors"
            >
              Philosophy
            </a>
            <a
              href="#invite"
              className="hover:text-neutral-200 transition-colors"
            >
              Request Invite
            </a>
            <Link
              href="/privacy"
              className="hover:text-neutral-200 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/login"
              className="hover:text-neutral-200 transition-colors"
            >
              Sign In
            </Link>
            <a
              href="mailto:info@achhaya.com"
              className="hover:text-neutral-200 transition-colors"
            >
              info@achhaya.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
