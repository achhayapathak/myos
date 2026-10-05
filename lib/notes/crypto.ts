import "server-only"
import crypto from "node:crypto"

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = "sha512"

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a cryptographically secure random salt.
 * Formatted as `${saltHex}:${hashHex}`.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex")
  return `${salt}:${hash}`
}

/**
 * Securely verifies a plaintext password against a stored `${saltHex}:${hashHex}` string
 * using constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false
  }

  const [salt, originalHash] = storedHash.split(":")
  if (!salt || !originalHash) {
    return false
  }

  try {
    const hashBuffer = crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      DIGEST
    )
    const originalBuffer = Buffer.from(originalHash, "hex")

    if (hashBuffer.length !== originalBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(hashBuffer, originalBuffer)
  } catch {
    return false
  }
}
