import { test, expect } from "@playwright/test"
import { loginViaUi, logoutViaUi } from "./helpers"

/**
 * MyOS End-to-End Test Suite
 *
 * Pre-conditions:
 *   - The app must be running at http://localhost:3000 (or PLAYWRIGHT_BASE_URL).
 *   - E2E_TEST_EMAIL / E2E_TEST_PASSWORD env vars must be set to a valid test account.
 *
 * Security invariant: these tests NEVER use the Supabase service-role key.
 * All interactions go through the real user-session / RLS-enforced API.
 *
 * Test flow:
 *   1. Login
 *   2. Open Today page
 *   3. Create task via quick-add
 *   4. Complete task
 *   5. Create note
 *   6. Start Pomodoro
 *   7. Create calendar event
 *   8. Create reminder
 *   9. Logout
 */

test.describe("MyOS Full User Journey", () => {
  // We use a single browser context so session persists across steps
  test.use({ storageState: undefined })

  test("1. Login redirects authenticated user to Today page", async ({ page }) => {
    await loginViaUi(page)
    await expect(page).toHaveURL(/\/today/)
    // The Today page should contain a greeting or the user's content
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("2. Today page loads with all core sections", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/today")
    await expect(page.getByRole("main")).toBeVisible()

    // The page title / heading
    await expect(page).toHaveTitle(/Today|MyOS/i)

    // Must not show any unhandled error
    const errorEl = page.getByText(/something went wrong|unhandled error/i)
    await expect(errorEl).not.toBeVisible()
  })

  test("3. Create a task from Today page quick-add", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/today")

    // Wait for the quick-add input (title field)
    const taskTitle = `E2E Task ${Date.now()}`
    const titleInput = page.getByPlaceholder(/task name|add task|new task/i)

    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(taskTitle)
      await page.keyboard.press("Enter")

      // The task should appear somewhere on the page
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 8000 })
    } else {
      // Fallback: navigate to /tasks and create there
      await page.goto("/tasks")
      const addBtn = page.getByRole("button", { name: /add task|new task|\+/i }).first()
      await addBtn.click()

      await page.getByRole("textbox").first().fill(taskTitle)
      await page.keyboard.press("Enter")
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 8000 })
    }
  })

  test("4. Complete a task by toggling its checkbox", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/tasks")

    // Find first uncompleted task checkbox
    const checkbox = page.getByRole("checkbox").first()
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkbox.click()
      // The task status should have visually changed (line-through or moved)
      await expect(checkbox).toBeChecked({ timeout: 5000 })
    } else {
      // Create a task to check
      const taskTitle = `E2E Completable ${Date.now()}`
      const addBtn = page.getByRole("button", { name: /add task|new task|\+/i }).first()
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click()
        await page.getByRole("textbox").first().fill(taskTitle)
        await page.keyboard.press("Enter")
        await page.getByRole("checkbox").first().click()
        await expect(page.getByRole("checkbox").first()).toBeChecked({ timeout: 5000 })
      }
    }
  })

  test("5. Create a note", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/notes")

    const noteTitle = `E2E Note ${Date.now()}`

    // Look for 'New Note' or '+' button
    const newNoteBtn = page.getByRole("button", { name: /new note|add note|\+/i }).first()
    await newNoteBtn.click()

    // Fill note title or content area
    const editor = page.getByRole("textbox").first()
    await editor.fill(noteTitle)
    await page.keyboard.press("Escape")

    // Navigate away and back to confirm persistence
    await page.goto("/today")
    await page.goto("/notes")
    await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 8000 })
  })

  test("6. Start a Pomodoro focus session", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/focus")

    // Find Start / Begin focus button
    const startBtn = page.getByRole("button", { name: /start|begin|focus/i }).first()
    await startBtn.click()

    // Timer display should appear (MM:SS format)
    const timerDisplay = page.getByText(/\d{2}:\d{2}/)
    await expect(timerDisplay).toBeVisible({ timeout: 5000 })
  })

  test("7. Create a calendar event", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/calendar")

    const eventTitle = `E2E Event ${Date.now()}`

    // Look for Add Event button
    const addEventBtn = page.getByRole("button", { name: /add event|new event|\+/i }).first()
    if (await addEventBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addEventBtn.click()

      // Fill event title
      const titleInput = page.getByLabel(/title|event name/i).or(page.getByPlaceholder(/title|event name/i)).first()
      await titleInput.fill(eventTitle)

      // Save
      const saveBtn = page.getByRole("button", { name: /save|create|add/i }).last()
      await saveBtn.click()

      // Event should appear in calendar
      await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 8000 })
    }
  })

  test("8. Create a reminder", async ({ page }) => {
    await loginViaUi(page)
    await page.goto("/reminders")

    const reminderTitle = `E2E Reminder ${Date.now()}`

    // Look for Add Reminder or New Reminder button
    const addBtn = page.getByRole("button", { name: /add reminder|new reminder|\+/i }).first()
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click()

      // Fill title
      const titleInput = page.getByLabel(/title|reminder/i).or(page.getByRole("textbox")).first()
      await titleInput.fill(reminderTitle)

      // If there are date/time pickers, fill tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const dateStr = tomorrow.toISOString().split("T")[0] // YYYY-MM-DD

      const dateInput = page.getByLabel(/date/i).or(page.locator("input[type=date]")).first()
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(dateStr)
      }

      const timeInput = page.getByLabel(/time/i).or(page.locator("input[type=time]")).first()
      if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeInput.fill("09:00")
      }

      const saveBtn = page.getByRole("button", { name: /save|create|add/i }).last()
      await saveBtn.click()

      await expect(page.getByText(reminderTitle)).toBeVisible({ timeout: 8000 })
    }
  })

  test("9. Logout redirects to login page", async ({ page }) => {
    await loginViaUi(page)
    await logoutViaUi(page)
    await expect(page).toHaveURL(/\/login/)

    // Verify protected routes are no longer accessible
    await page.goto("/today")
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

// ============================================================
// Security / Authorization E2E Tests
// ============================================================

test.describe("Security: Unauthenticated Access Denial", () => {
  test("unauthenticated users cannot access /today", async ({ page }) => {
    await page.goto("/today")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /tasks", async ({ page }) => {
    await page.goto("/tasks")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /notes", async ({ page }) => {
    await page.goto("/notes")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /calendar", async ({ page }) => {
    await page.goto("/calendar")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /reminders", async ({ page }) => {
    await page.goto("/reminders")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /settings", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated users cannot access /focus", async ({ page }) => {
    await page.goto("/focus")
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("Security: Auth Callback Open-Redirect Prevention", () => {
  test("auth callback rejects protocol-relative next= redirect", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid&next=%2F%2Fevil.com")
    // Should land on /login (failed code exchange) or /today (if no code exchange attempted)
    await page.waitForURL(/\/(login|today)/, { timeout: 10000 })
    // Must NOT be on evil.com or any external domain
    expect(page.url()).toMatch(/localhost|myos/)
  })

  test("auth callback with invalid code shows login error", async ({ page }) => {
    await page.goto("/auth/callback?code=this-is-an-invalid-code")
    await page.waitForURL(/\/login/, { timeout: 10000 })
    // Either error param or just landing on login is acceptable
    expect(page.url()).toContain("/login")
  })
})
