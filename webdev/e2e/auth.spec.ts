import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

function uniqueUser() {
  const id = randomUUID().slice(0, 8);
  return { name: `E2E Test ${id}`, email: `e2e-${id}@example.com`, password: 'Password123' };
}

async function registerViaUi(page: import('@playwright/test').Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function loginViaUi(page: import('@playwright/test').Page, email: string, password: string) {
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.describe('authentication', () => {
  test('registering a new account signs the user in and lands on an empty dashboard', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
    await expect(page.getByText('No repositories connected yet')).toBeVisible();
  });

  test('registering with an email already in use surfaces the real backend error', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await registerViaUi(page, user);

    await expect(page.getByText('An account with this email already exists')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('logging in with the wrong password surfaces the real backend error', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await loginViaUi(page, user.email, 'wrong-password-123');

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a returning user can log back in, and logging out blocks protected pages', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await loginViaUi(page, user.email, user.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // A logged-out session hitting a protected route is redirected back to /login.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('theme toggle persists across a reload', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);

    const html = page.locator('html');
    const initialIsDark = await html.evaluate((el) => el.classList.contains('dark'));

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(html).toHaveClass(initialIsDark ? /^(?!.*dark).*$/ : /dark/);

    await page.reload();
    await expect(html).toHaveClass(initialIsDark ? /^(?!.*dark).*$/ : /dark/);
  });
});
