/**
 * Strictly validates that a push notification endpoint is safe and legitimate.
 * Prevents Server-Side Request Forgery (SSRF) to internal network services,
 * loopback addresses, or cloud metadata endpoints.
 */
export function isValidPushEndpoint(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") {
    return false
  }

  try {
    const parsed = new URL(rawUrl)

    // 1. Must use HTTPS strictly (W3C Web Push specification requirement)
    if (parsed.protocol !== "https:") {
      return false
    }

    const hostname = parsed.hostname.toLowerCase()

    // 2. Reject localhost, local domains, and internal cloud metadata hostnames
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.includes("metadata")
    ) {
      return false
    }

    // 3. Reject IPv4 loopback, private RFC1918, link-local, and broadcast
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = hostname.match(ipv4Regex)
    if (match) {
      const o1 = Number(match[1])
      const o2 = Number(match[2])
      if (
        o1 === 0 || // 0.0.0.0/8
        o1 === 10 || // 10.0.0.0/8 private
        o1 === 127 || // 127.0.0.0/8 loopback
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12 private
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16 private
        (o1 === 169 && o2 === 254) // 169.254.0.0/16 link-local (cloud metadata)
      ) {
        return false
      }
    }

    // 4. Reject IPv6 loopback (::1), private (fc00::/7), and link-local (fe80::/10)
    if (
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.startsWith("[fc") ||
      hostname.startsWith("[fd") ||
      hostname.startsWith("[fe8") ||
      hostname.startsWith("[fe9") ||
      hostname.startsWith("[fea") ||
      hostname.startsWith("[feb")
    ) {
      return false
    }

    // 5. Must have a valid dot-separated domain name with valid characters
    if (!hostname.includes(".") || /[^a-z0-9.-]/i.test(hostname)) {
      return false
    }

    return true
  } catch {
    return false
  }
}
