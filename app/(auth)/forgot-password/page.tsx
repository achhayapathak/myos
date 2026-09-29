"use client"

import * as React from "react"
import Link from "next/link"
import { forgotPassword } from "@/app/(auth)/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Mail, ArrowLeft, Loader2, Send } from "lucide-react"

export default function ForgotPasswordPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await forgotPassword(formData)

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.success && result.message) {
      setSuccess(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Description */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Enter your owner email to receive recovery instructions
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{success}</span>
        </div>
      )}

      {/* Forgot Password Form */}
      {!success ? (
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 font-mono text-xs mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Sending link...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span>Send reset link</span>
              </>
            )}
          </Button>
        </form>
      ) : (
        <p className="text-xs font-mono text-muted-foreground">
          Please check your inbox and follow the link to set a new password.
        </p>
      )}

      {/* Return to Login link */}
      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  )
}
