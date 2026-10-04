import { test, expect } from "@playwright/test"
import { loginViaUi } from "./helpers"

/**
 * Habits Feature End-to-End Test Suite
 *
 * Implements the 11-step verification flow:
 *   1. Login
 *   2. Open Habits
 *   3. Create daily habit
 *   4. Complete it
 *   5. Verify streak
 *   6. Undo completion
 *   7. Complete again
 *   8. Verify Today dashboard
 *   9. Archive habit
 *   10. Verify it disappears from active habits
 *   11. Restore habit
 */

test.describe("Habit Tracker Feature E2E Flow", () => {
  test.use({ storageState: undefined })

  test("full 11-step habit lifecycle and Today dashboard integration", async ({ page }) => {
    const habitName = `E2E Workout ${Date.now()}`

    // 1. Login
    await loginViaUi(page)

    // 2. Open Habits
    await page.goto("/habits")
    await expect(page).toHaveURL(/\/habits/)
    await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible()

    // 3. Create daily habit
    // Look for "Add Habit" or "Create your first habit" button
    const addBtn = page.getByRole("button", { name: /add habit|create your first habit/i }).first()
    await addBtn.click()

    // Fill habit name in dialog
    const nameInput = page.getByLabel(/name/i).or(page.getByPlaceholder(/workout|read|name/i)).first()
    await nameInput.fill(habitName)

    // Submit form
    const createBtn = page.getByRole("button", { name: /create habit|save/i }).last()
    await createBtn.click()

    // Habit should now appear in the active habit list
    const habitItem = page.getByText(habitName)
    await expect(habitItem).toBeVisible({ timeout: 8000 })

    // 4. Complete it
    const completionCheckbox = page.getByRole("checkbox", {
      name: new RegExp(`mark ${habitName} as complete`, "i"),
    })
    await completionCheckbox.click()

    // Now accessible label should switch to "Mark ... as incomplete"
    const incompleteCheckbox = page.getByRole("checkbox", {
      name: new RegExp(`mark ${habitName} as incomplete`, "i"),
    })
    await expect(incompleteCheckbox).toBeVisible({ timeout: 5000 })

    // 5. Verify streak
    await expect(page.getByText(/1d/)).toBeVisible({ timeout: 5000 })

    // 6. Undo completion
    await incompleteCheckbox.click()
    await expect(completionCheckbox).toBeVisible({ timeout: 5000 })

    // 7. Complete again
    await completionCheckbox.click()
    await expect(incompleteCheckbox).toBeVisible({ timeout: 5000 })

    // 8. Verify Today dashboard
    await page.goto("/today")
    await expect(page).toHaveURL(/\/today/)
    // Habit should appear on the Today dashboard
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 8000 })

    // 9. Archive habit
    await page.goto("/habits")
    // Click habit item to open detail dialog
    await page.getByText(habitName).click()

    // Find and click "Archive Habit"
    const archiveBtn = page.getByRole("button", { name: /archive habit/i })
    await archiveBtn.click()

    // 10. Verify it disappears from active habits
    // Switch to Today tab or All tab
    const todayTab = page.getByRole("button", { name: /^today/i })
    await todayTab.click()
    await expect(page.getByText(habitName)).not.toBeVisible({ timeout: 5000 })

    // 11. Restore habit
    // Switch to Archived tab
    const archivedTab = page.getByRole("button", { name: /archived/i })
    await archivedTab.click()
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 5000 })

    // Open detail from archived view
    await page.getByText(habitName).click()
    const restoreBtn = page.getByRole("button", { name: /restore habit/i })
    await restoreBtn.click()

    // Switch back to All or Today tab to confirm it is restored
    const allTab = page.getByRole("button", { name: /^all/i })
    await allTab.click()
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 5000 })
  })
})
