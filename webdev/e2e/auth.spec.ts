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
  // A logout redirects here client-side (no full navigation), so wait for
  // the login form itself to have mounted rather than for network activity,
  // which may have already gone quiet before the SPA transition settles.
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function logoutViaUi(page: import('@playwright/test').Page, userName: string) {
  // The header re-renders once the session query settles after a fresh
  // login, which can detach/reattach the Log out button mid-click. Wait for
  // the settled header (the user's name next to it) before clicking.
  await expect(page.getByText(userName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
}

test.describe('authentication', () => {
  test.beforeAll(async ({ browser }) => {
    // Against `next dev`, each route compiles on its first visit, which can
    // take longer than a normal assertion timeout and makes whichever test
    // happens to hit an uncompiled route first look flaky. Warm every route
    // this suite visits once, up front, against a throwaway page/context so
    // the timed tests below never pay that cold-compile cost.
    const page = await browser.newPage();
    for (const path of ['/register', '/login', '/dashboard']) {
      await page.goto(path, { waitUntil: 'networkidle' });
    }
    await page.close();
  });

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

    await logoutViaUi(page, user.name);
    await expect(page).toHaveURL(/\/login$/);

    await registerViaUi(page, user);

    await expect(page.getByText('An account with this email already exists')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('logging in with the wrong password surfaces the real backend error', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await logoutViaUi(page, user.name);
    await expect(page).toHaveURL(/\/login$/);

    await loginViaUi(page, user.email, 'wrong-password-123');

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a returning user can log back in after logging out', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await logoutViaUi(page, user.name);
    await expect(page).toHaveURL(/\/login$/);

    await loginViaUi(page, user.email, user.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
  });

  test('logging out revokes access to protected pages', async ({ page }) => {
    const user = uniqueUser();
    await registerViaUi(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await logoutViaUi(page, user.name);
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
