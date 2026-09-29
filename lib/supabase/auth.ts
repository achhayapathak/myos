import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { User, Session } from "@supabase/supabase-js"

/**
 * Retrieves the currently authenticated user server-side.
 *
 * Uses `supabase.auth.getUser()` which strictly verifies the JWT against
 * the Supabase Auth server, rather than trusting unverified local cookie claims.
 *
 * @returns The authenticated `User` object, or `null` if no active/valid session exists.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}

/**
 * Retrieves the current session server-side.
 *
 * @returns The active `Session` object or `null`.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    return session
  } catch {
    return null
  }
}

/**
 * Asserts that a user is authenticated, throwing an Unauthorized error if not.
 * Useful for Server Actions and Route Handlers that require an authenticated user.
 *
 * @returns The verified non-null `User` object.
 * @throws Error if unauthenticated.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Unauthorized: Active authenticated session required.")
  }

  return user
}
