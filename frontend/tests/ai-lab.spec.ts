import { test, expect } from '@playwright/test';

test.describe('AI Lab Experiments', () => {
  test('should load AI Lab page', async ({ page }) => {
    await page.goto('/lab');
    await expect(page).toHaveTitle(/Maula AI/);
    await expect(page.locator('body')).toBeVisible();
  });
});
