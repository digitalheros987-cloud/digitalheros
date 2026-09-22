import { test, expect } from '@playwright/test';

test.describe('Phase 11: User Dashboard E2E Tests', () => {
  
  test('Unauthenticated user is redirected to login', async ({ page }) => {
    // Attempt to access dashboard without logging in
    await page.goto('/dashboard');
    
    // Should be redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Login');
  });

  test('Authenticated user can view dashboard with all sections', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'beenu2040@gmail.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check Dashboard Summary
    await expect(page.locator('h1')).toContainText('Welcome,');
    await expect(page.locator('text=Subscription')).toBeVisible();
    await expect(page.locator('text=Latest Score')).toBeVisible();
    await expect(page.locator('text=Supporting')).toBeVisible();
    await expect(page.locator('text=Upcoming Draw')).toBeVisible();
    await expect(page.locator('text=Total Winnings')).toBeVisible();

    // Check embedded sections
    await expect(page.locator('h2:has-text("1. Subscription")')).toBeVisible();
    await expect(page.locator('h2:has-text("2. Charity Selection")')).toBeVisible();
    await expect(page.locator('h2:has-text("3. Golf Scores")')).toBeVisible();
    await expect(page.locator('h2:has-text("4. Draw Participation")')).toBeVisible();
    await expect(page.locator('h2:has-text("5. Prize Winnings")')).toBeVisible();

    // Check specific data for this user (we know beenu2040 has winnings)
    await expect(page.locator('text=£200.00')).toBeVisible(); // Total winnings from Phase 8
    
    // Check scores list is present
    await expect(page.locator('table')).toBeVisible();
  });

  test('Empty states and data isolation', async ({ page }) => {
    // Login as a brand new user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'newuser999@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // If user doesn't exist, register them quickly
    await page.click('button[type="submit"]');
    if (await page.url().includes('/login')) {
      await page.goto('/register');
      await page.fill('input[name="full_name"]', 'New User');
      await page.fill('input[name="email"]', 'newuser999@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    }

    // Now on dashboard as new user, verify empty states
    // No subscription
    await expect(page.locator('text=Action Required')).toBeVisible();
    
    // No scores
    await expect(page.locator('text=No scores yet')).toBeVisible();
    
    // Charity defaults to nothing or empty state
    await expect(page.locator('text=None Selected')).toBeVisible();
    
    // Not eligible for draw
    await expect(page.locator('text=Not currently eligible')).toBeVisible();
    
    // No winnings
    await expect(page.locator('text=No Winnings Yet')).toBeVisible();
  });

  test('Responsive layout does not break on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'beenu2040@gmail.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verify sections stack and don't overflow (basic visibility check on small screen)
    await expect(page.locator('h2:has-text("1. Subscription")')).toBeVisible();
    await expect(page.locator('h2:has-text("5. Prize Winnings")')).toBeVisible();
    
    // Check that we can scroll/see the bottom
    await page.locator('h2:has-text("5. Prize Winnings")').scrollIntoViewIfNeeded();
  });
});
