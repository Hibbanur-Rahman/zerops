import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests exercise real user journeys (register/login/logout) against a
 * real running backend + database -- no mocking. Point E2E_BASE_URL at an
 * already-running frontend (e.g. this project's own dev subdomain, which is
 * already wired to the right backend URL and CORS config) to test against
 * that instead of a locally-spawned dev server.
 *
 * This project's runtime image is Alpine, and Playwright does not publish an
 * Alpine-native browser build -- install the distro's own package
 * (`apk add chromium`) and point PLAYWRIGHT_CHROMIUM_PATH at it (typically
 * /usr/bin/chromium). On a normal glibc dev machine or CI image, leave both
 * unset and Playwright's own managed browser is used.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  // Against `next dev`, Next.js compiles each route on its first visit --
  // the first navigation to a given page in a freshly-started dev server can
  // take several seconds. That's a one-time dev-server cold-start cost (a
  // production build or a warmed-up dev server doesn't pay it), but these
  // defaults need enough room for it so a slow first compile isn't mistaken
  // for a broken redirect.
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 20000,
    actionTimeout: 15000,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] } }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60000,
      },
});
