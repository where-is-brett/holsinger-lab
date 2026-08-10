import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Rebuilds and serves a real production build rather than `next dev`, matching
  // this project's established "verify against a real build" approach (Phases
  // 0/1/1C). This means every `test:e2e` run rebuilds even if `npm run build` was
  // just run separately (e.g. in CI's own prior "Build" step) — a deliberate
  // tradeoff for a config that works identically and self-containedly in local
  // dev and CI, at the cost of one redundant build in CI. See Task 6.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
