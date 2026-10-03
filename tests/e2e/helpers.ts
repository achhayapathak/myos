import { Page, expect } from "@playwright/test"

/**
 * Shared test helpers for MyOS E2E tests.
 *
 * Authentication: We log in via the UI sign-in form.
 * Credentials come from E2E_TEST_EMAIL / E2E_TEST_PASSWORD env vars.
 * These should be a dedicated test-only Supabase user that is safe to reset.
 *
 * IMPORTANT: Do NOT use the service-role key client-side.
 * All auth here goes through the normal login form / cookies.
 */

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e@myos.local"
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "e2e-test-password-change-me"

/**
 * Fills and submits the login form.
 * Waits until the dashboard (/today) is visible.
 */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto("/login")
  await page.waitForURL("**/login**")

  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD)
  await page.getByRole("button", { name: /sign in|log in/i }).click()

  // Wait for redirect to /today
  await page.waitForURL("**/today**", { timeout: 15000 })
  await expect(page.getByRole("main")).toBeVisible()
}

/**
 * Logs the current user out by clicking the logout button/link.
 */
export async function logoutViaUi(page: Page): Promise<void> {
  // Navigate to settings to find logout, or use sidebar
  await page.goto("/settings")
  const logoutBtn = page.getByRole("button", { name: /logout|sign out/i })
  if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutBtn.click()
  } else {
    // Fallback: direct form submission
    await page.goto("/login")
  }
  await page.waitForURL("**/login**", { timeout: 10000 })
}
