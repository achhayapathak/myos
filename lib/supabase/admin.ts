import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Creates an administrative Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 *
 * !!! CRITICAL SECURITY NOTICE !!!
 * - This client completely BYPASSES PostgreSQL Row Level Security (RLS).
 * - NEVER import or call this function in Client Components or code bundled for the browser.
 * - NEVER prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
 * - This function throws an immediate error if executed in a browser environment.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: createAdminClient() was invoked in a browser environment. Service-role credentials must never be exposed client-side."
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
