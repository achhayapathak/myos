import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.webmanifest / manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - offline (offline fallback shell)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
