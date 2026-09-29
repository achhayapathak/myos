"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { login } from "@/app/(auth)/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, Lock, Mail, ArrowRight, Loader2 } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const errorParam = searchParams.get("error")
  const KNOWN_ERRORS: Record<string, string> = {
    invalid_recovery_code: "The recovery code is invalid, expired, or has already been used.",
    session_expired: "Your session has expired. Please sign in again.",
    access_denied: "Access denied. Only the authorized owner may access this system.",
    unauthorized: "Please sign in to access this page.",
  }
  const safeParamError = errorParam
    ? KNOWN_ERRORS[errorParam] ?? "An error occurred during authentication."
    : null
  const errorMessage = formError ?? safeParamError

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await login(formData)
      if (result && result.error) {
        setFormError(result.error)
        setLoading(false)
      } else {
        router.push("/today")
        router.refresh()
      }
    } catch {
      // In Next.js, redirect() throws an internal error which indicates success
      router.push("/today")
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Description */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Enter your owner credentials to access your operating system
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-mono text-muted-foreground flex items-center gap-1.5"
          >
            <Mail className="size-3" />
            <span>Email</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="owner@domain.com"
            required
            autoComplete="email"
            autoFocus
            disabled={loading}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-mono text-muted-foreground flex items-center gap-1.5"
            >
              <Lock className="size-3" />
              <span>Password</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={loading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={loading}
            className="font-mono text-xs"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gap-2 font-mono text-xs mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-6 w-32 rounded bg-muted/60" />
          <div className="h-10 rounded-lg bg-muted/40" />
          <div className="h-10 rounded-lg bg-muted/40" />
          <div className="h-9 rounded-lg bg-muted/60" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  )
}
