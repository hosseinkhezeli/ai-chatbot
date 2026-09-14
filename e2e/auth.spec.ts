import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('sign in page loads correctly', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2, text=Sign in')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Sign in with GitHub")')).toBeVisible();
  });

  test('error page loads correctly', async ({ page }) => {
    await page.goto('/auth/error');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Error, text=Authentication error')).toBeVisible({ timeout: 10000 });
  });

  test('protected routes redirect to sign in', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/api/conversations');
    await page.waitForLoadState('networkidle');

    // Should return 401 or redirect to sign in
    const response = await page.waitForResponse(response => response.url().includes('/api/conversations'));
    expect([401, 302, 307]).toContain(response.status());
  });
});

test.describe('Session Persistence', () => {
  test('session persists across page reloads when authenticated', async () => {
    // This test requires a test user to be set up
    // Skip if no test credentials available
    test.skip(true, 'Requires test user credentials');
  });
});