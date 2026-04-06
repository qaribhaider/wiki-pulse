import { test, expect } from '@playwright/test';

test('Full Stack: Wikipedia -> Kafka -> Dashboard data path', async ({ page }) => {
  // 1. Open the dashboard
  await page.goto('/');

  // 2. Verify Status initially indicates connecting
  const statusIndicator = page.locator('#system-status');
  await expect(statusIndicator).toBeVisible();
  
  // 3. Wait for 'CONNECTED' or 'STREAMING' status
  // Our status logic: INITIATING -> CONNECTED -> STREAMING
  await expect(async () => {
    const statusText = await statusIndicator.textContent();
    expect(statusText).toMatch(/CONNECTED|STREAMING/);
  }).toPass({ timeout: 15000 });

  // 4. Verify Metrics component exists
  const identitySection = page.locator('h2:has-text("Edit Volume By Identity")');
  await expect(identitySection).toBeVisible();

  // 5. Verify live count changes (Actual Data Path Check)
  // We'll wait for the total registered count to be > 0 
  // This confirms Kafka is streaming real aggregated events
  const registeredCount = page.getByTestId('metric-registered');
  await expect(registeredCount).not.toHaveText('0', { timeout: 30000 });

  // 6. Check Language Distribution (Confirm Aggregator logic)
  const languageList = page.locator('h2:has-text("Global Language Traffic")');
  await expect(languageList).toBeVisible();
  
  // Verify at least one item shows up in the language grid (using first child of grid)
  await expect(page.locator('.grid-cols-2 > div').first()).toBeVisible({ timeout: 20000 });
});
