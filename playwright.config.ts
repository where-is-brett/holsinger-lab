import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { defineConfig, devices } from '@playwright/test'

// Several NEXT_PUBLIC_SANITY_* / WIX_FIXTURE env vars steer both the build
// this config's webServer runs (see below) and the specs themselves (e.g.
// `process.env.WIX_FIXTURE` gates fixture-only assertions in
// e2e/wix-team.spec.ts). Those vars are public (see .github/workflows/ci.yml),
// and CI sets them directly at the job level -- but locally, unlike
// `next build`/`next start` (which load `.env.local` themselves), the
// Playwright test process itself never reads `.env.local`. This loads it
// here, once, before any spec file is required, without a `dotenv`
// dependency. Existing env vars (CI's, or anything the shell already set)
// always win.
const envLocalPath = path.resolve(__dirname, '.env.local')
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const key = match[1]
    let value = (match[2] ?? '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

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
  // `mobile-safari` (devices['iPhone 13']) is the only WebKit coverage this
  // suite has -- Safari/iOS is the engine we previously had zero visibility
  // into. `mobile-chrome` (devices['Pixel 7']) is the only touch-enabled
  // Chromium coverage -- `chromium` above runs Desktop Chrome with a mouse,
  // never a touch pointer. Specs that call `test.use({ viewport })` (most of
  // the existing suite) keep their own viewport under these two projects --
  // they still gain real engine and touch/UA coverage, just not the device's
  // own viewport. e2e/wix-mobile.spec.ts is the one spec that deliberately
  // does *not* override the device viewport, so it alone exercises the real
  // iPhone 13 / Pixel 7 dimensions end to end.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
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
