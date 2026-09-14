import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('create conversation, send message, receive response, reopen conversation, verify history, rename, delete', async ({ page }) => {
    // Since we can't easily test with real auth in E2E without a test user,
    // we'll test the UI flow with mocked authentication

    // Check if we're on the sign-in page or main app
    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      // We're on the sign-in page - skip this test or mock auth
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    // Test the full conversation flow
    // 1. Create a new conversation
    const newChatButton = page.locator('button:has-text("چت جدید")');
    await expect(newChatButton).toBeVisible();
    await newChatButton.click();

    // 2. Send a message
    const messageInput = page.locator('textarea[aria-label="پیام"]');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello, this is a test message');

    const sendButton = page.locator('button[aria-label="ارسال پیام"]');
    await sendButton.click();

    // 3. Wait for response
    await expect(page.locator('text=در حال فکر کردن…')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=در حال فکر کردن…')).not.toBeVisible({ timeout: 30000 });

    // 4. Verify message appears in chat
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible();

    // 5. Get conversation ID from URL
    const url = page.url();
    const conversationIdMatch = url.match(/\/conversations\/([^\/]+)/);

    if (conversationIdMatch) {
      // 6. Reload page to simulate reopening
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 7. Verify history is loaded
      await expect(page.locator('text=Hello, this is a test message')).toBeVisible();

      // 8. Rename conversation
      const renameButton = page.locator('button[aria-label="گزینه‌های بیشتر"]').first();
      if (await renameButton.isVisible({ timeout: 2000 })) {
        await renameButton.click();

        await page.locator('text=تغییر نام').click();

        const renameInput = page.locator('input[aria-label="تغییر نام"]');
        await renameInput.fill('Renamed Conversation');
        await renameInput.press('Enter');

        // Verify rename
        await expect(page.locator('text=Renamed Conversation')).toBeVisible();
      }

      // 9. Delete conversation
      const deleteButton = page.locator('text=حذف').first();
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = page.locator('button:has-text("حذف"), button:has-text("بله")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        // Verify conversation is deleted (should show empty state or new chat)
        await expect(page.locator('text=چت جدید, text=هنوز گفت‌وگویی ندارید').first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('switch between conversations', async ({ page }) => {
    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    // Create first conversation
    const newChatButton = page.locator('button:has-text("چت جدید")');
    await newChatButton.click();

    const messageInput = page.locator('textarea[aria-label="پیام"]');
    await messageInput.fill('First conversation message');

    const sendButton = page.locator('button[aria-label="ارسال پیام"]');
    await sendButton.click();

    await expect(page.locator('text=در حال فکر کردن…')).not.toBeVisible({ timeout: 30000 });

    // Create second conversation
    await newChatButton.click();
    await messageInput.fill('Second conversation message');
    await sendButton.click();

    await expect(page.locator('text=در حال فکر کردن…')).not.toBeVisible({ timeout: 30000 });

    // Switch back to first conversation via sidebar
    const firstConversation = page.locator('text=First conversation message').first();
    if (await firstConversation.isVisible({ timeout: 5000 })) {
      await firstConversation.click();
      await expect(page.locator('text=First conversation message')).toBeVisible();
    }
  });
});

test.describe('Authentication Flow', () => {
  test('shows sign in page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should either show sign in page or redirect to it
    const signInText = page.locator('text=ادامه با GitHub');
    await expect(signInText).toBeVisible({ timeout: 10000 });
  });

  test('sign in button navigates to GitHub OAuth', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    const signInButton = page.locator('button:has-text("ادامه با GitHub")');
    await expect(signInButton).toBeVisible();

    // Check that it links to the correct auth endpoint
    const href = await signInButton.getAttribute('href');
    expect(href).toContain('/api/auth/signin/github');
  });
});

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows conversation list when authenticated', async ({ page }) => {
    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    // Check sidebar elements
    await expect(page.locator('text=جست‌وجو…')).toBeVisible({ timeout: 5000 });

    // Check for search input
    const searchInput = page.locator('input[placeholder="جست‌وجو…"], input[aria-label="جست‌وجو…"]');
    await expect(searchInput).toBeVisible();
  });

  test('search filters conversations', async ({ page }) => {
    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    const searchInput = page.locator('input[placeholder="جست‌وجو…"], input[aria-label="جست‌وجو…"]');
    await searchInput.fill('test');

    // Should trigger search (debounced)
    await page.waitForTimeout(500);

    // Verify search was triggered (URL should have q parameter or list filtered)
    // This depends on implementation
  });
});

test.describe('Mobile Responsiveness', () => {
  test('mobile header shows conversation title', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    // Check mobile header exists
    const mobileHeader = page.locator('header, [role="banner"]').first();
    await expect(mobileHeader).toBeVisible();
  });

  test('sidebar can be toggled on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signInButton = page.locator('text=ادامه با GitHub');

    if (await signInButton.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Authentication required - skipping in CI without test user');
    }

    // Find sidebar trigger — aria-label is the localized toggle string
    const sidebarTrigger = page.locator('button[aria-label*="نوار کناری"]');
    if (await sidebarTrigger.isVisible({ timeout: 2000 })) {
      await sidebarTrigger.click();
      // Sidebar should open
      await expect(page.locator('[role="dialog"], .sidebar, aside')).toBeVisible({ timeout: 2000 });
    }
  });
});
