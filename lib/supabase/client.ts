import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a Supabase client for use in Client Components (Browser).
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * All operations performed with this client are strictly subject to Row Level Security (RLS).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser client error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined."
    )
  }

  return createBrowserClient(url, anonKey)
}
