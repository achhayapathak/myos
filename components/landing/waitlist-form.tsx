"use client"

import { useActionState } from "react"
import Link from "next/link"
import { joinWaitlist } from "@/lib/waitlist/actions"
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react"

export function WaitlistForm({
  buttonText = "Request an invitation",
  id,
}: {
  buttonText?: string
  id?: string
}) {
  const [state, formAction, isPending] = useActionState(joinWaitlist, null)

  if (state?.success) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <CheckCircle2 className="size-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-emerald-300 font-medium">
            {state.message}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Your email is only used to deliver your personal invitation and access details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} id={id}>
      {/* Honeypot field — hidden from users, bots fill this */}
      <div
        className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor={`company-${id || "default"}`}>Company</label>
        <input
          type="text"
          name="company"
          id={`company-${id || "default"}`}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isPending}
          aria-label="Email address"
          className="h-10 flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-10 shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-all hover:bg-neutral-200 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {buttonText}
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {state?.success === false && (
        <p className="text-sm text-red-400 mt-2">{state.message}</p>
      )}

      <p className="text-[11px] text-neutral-500 mt-3">
        Private and invite-only. Requests reviewed personally.{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-neutral-400 transition-colors"
        >
          Privacy policy
        </Link>
      </p>
    </form>
  )
}
