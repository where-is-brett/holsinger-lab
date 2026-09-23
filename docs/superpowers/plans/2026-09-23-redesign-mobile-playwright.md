# Redesign — mobile Playwright projects (WebKit + touch Chromium)

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Run the whole redesign e2e suite on WebKit (iPhone 13) and touch Chromium (Pixel 7) in CI, fix whatever that surfaces, and tap-drive the mobile menu.

**Architecture:** Mirror `redesign/wix` PR #48, which added the same two Playwright projects, the CI WebKit install and a `test:e2e:mobile` script. Engine or harness gaps that can't be fixed get scoped `test.skip(...)` calls with a stated reason. The suite is never weakened across the board.

**Tech stack:** Playwright (the `devices['iPhone 13']` and `devices['Pixel 7']` projects), Next.js 16, Tailwind 4, and GitHub Actions `ubuntu-latest`.

**Base:** `redesign/mobile-playwright`, branched off `redesign/integration` at `aeaaa88` (PR 2 merged). Approved order: this PR comes after PR 2 and before PR 3.

## Global Constraints

- **Prohibited:** never write to Sanity, never use a bare `git stash`, never run `npm audit fix --force`, and don't touch `main`.
- **e2e must hold for any valid dataset.** Tests that need data the dataset can't provide use the `/preview/components` gallery fixtures.
- **No blanket skips.** A skip is allowed only for these two measured WebKit harness limits (from #48), or for another limit you measure and prove:
  - (a) WebKit doesn't Tab-focus links by default;
  - (b) WebKit has no `clipboard-write` permission, though `writeText` works under a real tap.
  Every skip names the project (`test.skip(testInfo.project.name === 'mobile-safari', '<reason>')`) and gives the measured reason.
- **Real defects get fixed in the product, not skipped.** A defect is a style WebKit drops, a layout that overflows on the device, or an interaction that fails under touch.
- **Unspaced `calc()` trap.** WebKit drops a declaration containing an unspaced `calc()`. The redesign source has no `calc(` today. If Tailwind generates one from an arbitrary value, fix the value.
- **Tailwind 4 rules:** follow the same-property rule, and prove every new utility with `npm run css:proof -- --grep '<selector>'`.
- **Comments** state the current reason only.
- **Local e2e runs:** `:3000` may belong to another worktree. Use a temporary untracked `playwright.alt.config.ts` on `:3100` with `reuseExistingServer: false`, and delete it before committing. Run `rm -rf .next/cache/fetch-cache` first, and afterwards `git checkout origin/redesign/integration -- next-env.d.ts`.
- **Gates:**
  - type-check;
  - lint (0 errors, 4 warnings);
  - vitest;
  - build;
  - the full e2e suite on **all three** projects.
- **Commit trailer:** `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **WebKit-only style drops.** The page looks right in Chromium but a declaration is missing in WebKit. Probe the computed styles of key tokens (fonts, `clamp()` sizes, grid templates, `scroll-margin`, `text-wrap: balance`) under WebKit.
2. **The mobile menu Dialog under touch.** It must open, a link tap must navigate, and it must close by the close button and by Escape where applicable. Focus must be restored. Phase 2C already had a Dialog touch-input bug.
3. **Real device viewports.** At 390×844 and 412×915, no page may scroll horizontally.
4. **Copy citation under a tap on WebKit.** It must copy, or fail visibly, never silently.
5. **Specs that set their own viewport** still run on the WebKit engine. Their assertions must not assume Chromium metrics, such as scrollbar width or font rasterisation. If one does, make the assertion engine-neutral rather than skipping it.

---

### Task 1: Projects, CI, triage and fixes

**Files:**
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `package.json`
- new `e2e/mobile.spec.ts`
- whatever product files the triage shows need fixing

- [ ] **Step 1. Mirror #48.** Add these projects to `playwright.config.ts`:
  - `{ name: 'mobile-safari', use: { ...devices['iPhone 13'] } }`
  - `{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }`

  Give them the same comment #48 uses, adapted to say `e2e/mobile.spec.ts`. In CI, change the install step to `npx playwright install --with-deps chromium webkit`. In `package.json`, add `"test:e2e:mobile": "playwright test --project=mobile-safari --project=mobile-chrome"`. Install WebKit locally with `npx playwright install webkit`.
- [ ] **Step 2. Write `e2e/mobile.spec.ts`.** It uses the device viewports and doesn't override them. It covers:
  - **The mobile menu, tap-driven.** On `/` at the device viewport:
    1. Tap `Menu`. The dialog is visible and focus sits inside it.
    2. Tap the "Publications" link. The URL becomes `/publications`, the dialog is gone and the page heading is visible.
    3. Reopen the menu and tap the close control. The dialog is gone.
    4. Reopen the menu and press Escape. It closes, and focus returns to the Menu button.

    Use `locator.tap()`, which needs `hasTouch`; the device descriptors set it. Under the `chromium` project, run this spec with `test.skip(!testInfo.project.use.hasTouch, 'touch-only spec')`.
  - **No horizontal overflow** at the device viewport on `/`, `/publications`, a paper page, `/people`, the PI profile, `/research`, `/resources` and `/contact`. Resolve paper and profile slugs through `e2eClient`.
  - **The copy-citation tap on `/publications`.** Tap the first row's copy button, then assert the visible "Copied" state, or whatever the component shows. Read `CopyCitation.tsx` to learn its states. If the clipboard is truly unavailable, the component must show its fallback visibly.
- [ ] **Step 3. Run the full suite on all three projects** and collect every failure. Put a triage table in the report with these columns: test, project, cause, and the fix or skip you chose.
- [ ] **Step 4. Fix the product defects.** Write the failing assertion first where you can.
- [ ] **Step 5. Add scoped skips** only for proven harness limits (a) and (b), and for any other limit you measure and document.
- [ ] **Step 6. Run the gates** on all three projects, and record the duration of each project's run.
- [ ] **Step 7. Commit** with the message `test(e2e): run the suite on WebKit (iPhone 13) and touch Chromium (Pixel 7); tap-drive the mobile menu`, plus separate `fix:` commits for any product defects you found.
