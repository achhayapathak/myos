import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next")

  // Strict open-redirect prevention:
  // Must start with '/' and must NOT start with '//' or '/\'
  let safeNext = "/today"
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")) {
    safeNext = rawNext
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  // Redirect to login with standard error code if exchange fails
  return NextResponse.redirect(new URL("/login?error=invalid_recovery_code", origin))
}
