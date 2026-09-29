/**
 * MyOS — Supabase Connectivity Verification Script
 *
 * Runs locally to verify that your .env.local configuration is valid
 * and that the Supabase instance is reachable.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-supabase.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log("\n=======================================================")
console.log("             MyOS — Supabase Health Check              ")
console.log("=======================================================\n")

let hasErrors = false

// 1. Check URL
if (!url) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local")
  hasErrors = true
} else if (url.includes("placeholder-project") || url.includes("your-project-ref")) {
  console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL is set to a placeholder value:")
  console.warn(`   ${url}`)
  console.warn("   -> Replace with your actual Supabase URL (e.g. https://xyzcompany.supabase.co)\n")
  hasErrors = true
} else {
  console.log(`✅ Supabase URL configured: ${url}`)
}

// 2. Check Anon Key
if (!anonKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local")
  hasErrors = true
} else if (anonKey.includes("placeholder-anon-key") || anonKey.includes("your-supabase-anon-key-here")) {
  console.warn("⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is set to a placeholder value.")
  console.warn("   -> Replace with your actual Supabase anon key from Project Settings > API.\n")
  hasErrors = true
} else {
  console.log("✅ Supabase Anon Key configured (public/browser safe)")
}

// 3. Check Service Role Key (server-only)
if (!serviceRoleKey) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local (required for server-side administrative tasks).")
} else if (serviceRoleKey.includes("placeholder-service-role-key") || serviceRoleKey.includes("your-supabase-service-role-key-here")) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is set to a placeholder value.")
} else {
  console.log("✅ Supabase Service Role Key configured (server-only)")
}

// 4. Live Connectivity Ping (if not using placeholders)
if (!hasErrors && url && anonKey) {
  console.log("\nTesting live connectivity to Supabase Auth service...")
  try {
    const healthUrl = `${url.replace(/\/$/, "")}/auth/v1/health`
    const res = await fetch(healthUrl, {
      headers: {
        apikey: anonKey,
      },
    })

    if (res.ok) {
      console.log(`✅ Successfully reached Supabase Auth endpoint (Status: ${res.status})`)
    } else {
      console.warn(`⚠️  Endpoint responded with status ${res.status}: ${res.statusText}`)
    }
  } catch (err) {
    console.error("❌ Connection failed to Supabase URL:", err.message)
  }
}

console.log("\n-------------------------------------------------------")
if (hasErrors) {
  console.log("Status: CONFIGURATION REQUIRED")
  console.log("Follow the setup steps to configure your .env.local credentials.")
} else {
  console.log("Status: READY — Supabase credentials verified.")
}
console.log("=======================================================\n")
