"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { resetPassword } from "@/app/(auth)/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, Lock, ArrowRight, Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await resetPassword(formData)
      if (result && result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        router.push("/today")
        router.refresh()
      }
    } catch {
      router.push("/today")
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Description */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Set new password
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Enter and confirm your new account password
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Password Reset Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-mono text-muted-foreground flex items-center gap-1.5"
          >
            <Lock className="size-3" />
            <span>New Password</span>
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            autoFocus
            disabled={loading}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-mono text-muted-foreground flex items-center gap-1.5"
          >
            <Lock className="size-3" />
            <span>Confirm Password</span>
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
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
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Update password</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
