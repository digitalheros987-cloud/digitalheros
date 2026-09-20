import { test, expect } from '@playwright/test';

test.describe('Authentication and Authorization', () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'password123',
  };

  test('User can register and profile is created', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to profile page
    await expect(page).toHaveURL(/\/profile/);
    
    // Verify profile data is displayed
    await expect(page.locator('text=User Profile')).toBeVisible();
    await expect(page.locator(`text=${testUser.fullName}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
    await expect(page.locator('text=user')).toBeVisible(); // role
  });

  test('User can log in and log out', async ({ page }) => {
    // We'll create another user specifically for login/logout test
    const loginUser = {
      fullName: `Login User ${timestamp}`,
      email: `login${timestamp}@example.com`,
      password: 'password123',
    };
    
    // First register
    await page.goto('/register');
    await page.fill('input[name="fullName"]', loginUser.fullName);
    await page.fill('input[name="email"]', loginUser.email);
    await page.fill('input[name="password"]', loginUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/profile/);

    // Logout
    await page.click('button:has-text("Log Out")');
    await expect(page).toHaveURL(/\/login/);

    // Login again
    await page.fill('input[name="email"]', loginUser.email);
    await page.fill('input[name="password"]', loginUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/profile/);
  });

  test('Unauthenticated user cannot access protected routes', async ({ page }) => {
    await page.goto('/profile');
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Non-admin cannot access admin functionality', async ({ page }) => {
    const nonAdminUser = {
      fullName: `Non Admin ${timestamp}`,
      email: `nonadmin${timestamp}@example.com`,
      password: 'password123',
    };

    // Register normal user
    await page.goto('/register');
    await page.fill('input[name="fullName"]', nonAdminUser.fullName);
    await page.fill('input[name="email"]', nonAdminUser.email);
    await page.fill('input[name="password"]', nonAdminUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/profile/);

    // Attempt to access admin page
    await page.goto('/admin');
    
    // Should be redirected back to profile because they are not admin
    await expect(page).toHaveURL(/\/profile/);
  });
});
