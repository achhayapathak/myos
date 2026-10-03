import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright E2E Configuration
 *
 * Tests assume the app is running locally on port 3000.
 * For CI: set PLAYWRIGHT_BASE_URL to the staging URL.
 * For local dev: `pnpm run dev` then `pnpm run test:e2e`.
 *
 * Authentication is handled by creating a session via Supabase Auth
 * directly in the test setup, not through the UI login form on every run.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",

  /* Run tests in parallel */
  fullyParallel: false, // Sequential for auth state sharing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for DB state isolation
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    /* Browser-level timeout */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    /* Desktop Chrome — primary target */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    /* Mobile Safari — for mobile UX verification */
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],

  /* Run dev server automatically when not in CI */
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: "pnpm run dev",
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
      }),
})
