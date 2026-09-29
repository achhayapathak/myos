import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

/**
 * Determines whether a route requires redirection based on the user's authentication state.
 *
 * @param pathname Current request path
 * @param user The authenticated user object or null
 * @returns The destination redirect path, or null if access is granted
 */
export function getAuthRedirect(pathname: string, user: User | null): string | null {
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback")

  // Unauthenticated user attempting to access protected route
  if (!user && !isAuthRoute) {
    return "/login"
  }

  // Authenticated user attempting to access login or forgot-password
  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    return "/today"
  }

  return null
}

/**
 * Updates the user's Supabase auth session in Next.js middleware / proxy.
 * Ensures expired auth tokens are refreshed and the new session cookie is set
 * on both the incoming request headers and outgoing response headers,
 * enforcing route protection for unauthenticated users.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase environment variables are missing or default placeholders:
  if (!url || !anonKey || url.includes("placeholder-project")) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Service Configuration Error: Supabase credentials missing.", {
        status: 500,
      })
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser().
  // Calling getUser() validates the JWT with the Supabase Auth server and refreshes expired tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const redirectPath = getAuthRedirect(request.nextUrl.pathname, user)
  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = redirectPath
    if (redirectPath === "/today") {
      redirectUrl.search = ""
    }
    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
