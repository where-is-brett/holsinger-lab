# Phase 3A — Design Tokens, Typography, Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inherited `@sanity/demo` palette with a semantic design-token layer, fix the one WCAG contrast failure, make dark mode actually work, correct the `sizes` attribute on every image, and consolidate spacing — so that Phase 3B/3C build on a real design system instead of retrofitting one.

**Architecture:** Seven tasks in a deliberate order. Task 1 introduces the token layer as a **strictly value-preserving** refactor — one semantic token per distinct colour currently in use, so every computed style is byte-identical before and after. That makes a large, scary find-and-replace mechanically verifiable. Only *after* equivalence is proven do Tasks 2–6 make deliberate changes (consolidation, contrast fix, dark mode, `sizes`, type roles, spacing), each small enough to inspect. Task 7 re-runs the full verification sweep and shrinks the axe allowlist.

**Tech Stack:** Tailwind 4.3.3 (`@theme` / `@theme inline` CSS-first config), Next 16.3.0 App Router, Vitest 4.1.10, Playwright 1.62.1 + `@axe-core/playwright` 4.12.1.

## Global Constraints

- **Every task ends with `npx tsc --noEmit`, `npx eslint .`, `npm run build`, and `npm test` green**, run with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` (public values, not secrets — see `.github/workflows/ci.yml`). `npm run build` needs real network access to `*.api.sanity.io`.
- **Never verify a colour change by reading CSS.** Build, serve, and read `getComputedStyle` in a real browser. This is Phase 1C's retrospective lesson and this phase's design doc §5 restates it: a token-name grep over markup is necessary but not sufficient. Phase 1C shipped four regressions that a source-read could not have caught.
- **Never hand-convert a hex value.** Every colour in this plan was computed and contrast-checked in code (design doc §1.5, and the dark-mode table in Task 3). If a computed style disagrees with a number here, re-derive it in code — do not adjust by eye. Phase 1C caught exactly one arithmetic slip this way (`#728192` for `rgb(114 120 146)` instead of `#727892`).
- **Task 1 is a zero-change refactor and must be proven so.** If Task 1's Step 6 finds any computed-style difference, that is a bug in Task 1, not an acceptable side effect. All deliberate changes belong to Tasks 2–5, where they are enumerated.
- **`heading-order` on `/tutorial` stays in `KNOWN_VIOLATIONS`.** It is authored Sanity content, not a component bug; fixing it needs live CMS write access this environment does not have. Do not remove it, do not "fix" it by changing `CustomPortableText`. The `/` `color-contrast` entry **must** come out in Task 6.
- **Do not touch `sanity.types.ts` by hand.** It is generated; CI checks freshness via `npm run typegen`. No task in this plan changes the schema, so it should not change — if it does, something is wrong.
- **Two manual, live-deploy-dependent items are carried forward, not resolved here** (design doc §3): confirming the Sanity webhook hits `/api/revalidate` with `SANITY_WEBHOOK_SECRET`, and confirming `VisualEditing` overlays render against a real draft-mode session. Repeat both in the PR description.

---

## File Structure

| File | Responsibility after this phase |
|---|---|
| `styles/index.css` | The design system. Semantic `@theme inline` block (colour, type-role, and gutter tokens), light/dark `:root` definitions, base-layer rules. The only file that names a hex value. |
| `components/**/*.tsx` | Consume semantic utilities (`bg-surface`, `text-text-muted`) only. No component names a palette shade (`gray-600`) or a raw colour after Task 1. |
| `components/shared/ImageBox.tsx`, `ImageContainer.tsx` | Gain a required-in-practice `size` prop contract; stop defaulting to `100vw`. |
| `e2e/axe.spec.ts` | `KNOWN_VIOLATIONS` shrinks by one entry (`/` `color-contrast`). |
| `e2e/theme.spec.ts` | **New.** Asserts dark mode actually applies on every route — the regression guard for §1.4's finding. |

---

## Task 1: Introduce the semantic token layer (value-preserving)

**Files:**
- Modify: `styles/index.css`
- Modify: `components/shared/ImageBox.tsx:25`, `components/shared/ImageContainer.tsx:31`, `components/shared/Layout.tsx:18`, `components/shared/Header.tsx:27`, `components/shared/CustomPortableText.tsx:33,139`, `components/shared/TimelineSection.tsx:11`, `components/shared/TimelineItem.tsx:34,38,40,50`
- Modify: `components/global/Footer.tsx:13`, `components/global/Navbar/DesktopNavBar.tsx:19,31,33,34,46,54,62`, `components/global/Navbar/MobileNavBar.tsx:10,44,176,179,264,274,283,292`
- Modify: `components/pages/home/ProjectListItem.tsx:15,48`, `components/pages/page/Page.tsx:21`, `components/pages/people/Profile.tsx:73,74,85,108,116`, `components/pages/publications/Publication.tsx:89`, `components/pages/contact/ErrorDialog.tsx:37,49,53,58`, `components/pages/contact/ContactForm.tsx:136,152,166,179,186`
- Modify: `components/preview/PreviewBanner.tsx:10`, `app/layout.tsx:111`, `app/not-found.tsx:52`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the semantic utility names every later task and every Phase 3B/3C component uses — `bg-surface`, `bg-surface-raised`, `bg-surface-inverse`, `bg-scrim`, `text-text`, `text-text-strong`, `text-text-body`, `text-text-muted`, `text-text-subtle`, `text-text-inverse`, `text-link`, `border-accent`, `border-field`, `bg-rule`. Task 2 prunes `text-strong` / `text-body` / `text-subtle`; everything else is permanent.

**The mapping table.** Every value is the current compiled value, verified in Phase 1C's reference table and re-verified in this phase's design doc §1.5. One token per *distinct current value* — consolidation is Task 2's job, not this task's.

| New token | Value | Replaces | Used as |
|---|---|---|---|
| `--color-surface` | `#f8f8f8` | `background` | page/nav/footer background |
| `--color-surface-raised` | `#f6f6f8` | `gray-50` | image placeholder box |
| `--color-surface-inverse` | `#1b1d27` | `gray-900` (as bg) | submit button, dialog button |
| `--color-scrim` | `#0d0e12` | `black` (as bg) | preview banner, dialog backdrop, hamburger bars |
| `--color-text` | `#0d0e12` | `black` (as text) | body text |
| `--color-text-strong` | `#1b1d27` | `gray-900` (as text) | header description, page paragraphs |
| `--color-text-body` | `#252837` | `gray-800` | error dialog message |
| `--color-text-muted` | `#515870` | `gray-600` | roles, inactive nav, captions, blockquote |
| `--color-text-subtle` | `#727892` | `gray-500` | project overview text |
| `--color-text-inverse` | `#ffffff` | `white` | text on inverse/scrim surfaces |
| `--color-link` | `#4043e7` | `blue-600` | links |
| `--color-accent` | `#2d6a4f` | `primary` | borders, rules |
| `--color-field` | `#bbbdc9` | `gray-300` | form input borders |
| `--color-rule` | `#e3e4e8` | `gray-200` | timeline divider |

- [ ] **Step 1: Capture the baseline**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

Wait for `http://localhost:3210/` to return 200, then in a real browser run this against `/`, `/people`, `/publications`, `/contact`, and `/projects/publication-highlights`. **Save the output** — Step 6 diffs against it.

```js
(() => {
  const probe = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : 'ABSENT' }
  return JSON.stringify({
    layoutBg:   probe('body > div.flex.min-h-screen', 'backgroundColor'),
    layoutText: probe('body > div.flex.min-h-screen', 'color'),
    bodyBg:     probe('body', 'backgroundColor'),
    nav:        probe('nav', 'backgroundColor'),
    navLink:    probe('nav a:not([aria-current])', 'color'),
    footer:     probe('footer', 'backgroundColor'),
    footerText: probe('footer', 'color'),
    h1:         probe('h1', 'color'),
    imgBox:     probe('div.overflow-hidden', 'backgroundColor'),
    link:       probe('main a[href^="http"], main a[href^="mailto"]', 'color'),
  }, null, 2)
})()
```

- [ ] **Step 2: Add the semantic layer to `styles/index.css`**

Insert immediately after the existing `@theme { … }` block (which stays exactly as it is — it still backs the base-layer rules and any not-yet-migrated utility) and before `@layer base`:

```css
/* Semantic tokens. Components reference these, never the palette above.
   `@theme inline` makes utilities resolve to the `--sem-*` custom property
   rather than to a snapshot of its value, which is what lets a media query
   below re-point the whole system for dark mode (Task 3). */
@theme inline {
  --color-surface: var(--sem-surface);
  --color-surface-raised: var(--sem-surface-raised);
  --color-surface-inverse: var(--sem-surface-inverse);
  --color-scrim: var(--sem-scrim);
  --color-text: var(--sem-text);
  --color-text-strong: var(--sem-text-strong);
  --color-text-body: var(--sem-text-body);
  --color-text-muted: var(--sem-text-muted);
  --color-text-subtle: var(--sem-text-subtle);
  --color-text-inverse: var(--sem-text-inverse);
  --color-link: var(--sem-link);
  --color-accent: var(--sem-accent);
  --color-field: var(--sem-field);
  --color-rule: var(--sem-rule);
}

:root {
  --sem-surface: #f8f8f8;
  --sem-surface-raised: #f6f6f8;
  --sem-surface-inverse: #1b1d27;
  --sem-scrim: #0d0e12;
  --sem-text: #0d0e12;
  --sem-text-strong: #1b1d27;
  --sem-text-body: #252837;
  --sem-text-muted: #515870;
  --sem-text-subtle: #727892;
  --sem-text-inverse: #ffffff;
  --sem-link: #4043e7;
  --sem-accent: #2d6a4f;
  --sem-field: #bbbdc9;
  --sem-rule: #e3e4e8;
}
```

**Do not delete the existing `@theme` palette block in this task.** `@layer base`'s `border-color: var(--color-primary, currentColor)` rule depends on it, and removing both at once would make a Step 6 failure ambiguous. Task 2 removes it.

- [ ] **Step 3: Repoint every component**

Apply the mapping table. The complete, exhaustive list of edits — this is every colour utility in the codebase, from a full-tree grep of `bg-white|text-white|text-black|bg-gray-|text-gray-|bg-background|bg-black|border-gray-|text-blue-|bg-primary|border-primary`:

| File:line | From | To |
|---|---|---|
| `shared/ImageBox.tsx:25` | `bg-gray-50` | `bg-surface-raised` |
| `shared/ImageContainer.tsx:31` | `bg-gray-50` | `bg-surface-raised` |
| `shared/Layout.tsx:18` | `bg-background text-black` | `bg-surface text-text` |
| `shared/Header.tsx:27` | `text-gray-900` | `text-text-strong` |
| `shared/CustomPortableText.tsx:33` | `text-gray-600` | `text-text-muted` |
| `shared/CustomPortableText.tsx:139` | `text-gray-600` | `text-text-muted` |
| `shared/TimelineSection.tsx:11` | `text-black` | `text-text` |
| `shared/TimelineItem.tsx:34` | `bg-gray-200` | `bg-rule` |
| `shared/TimelineItem.tsx:38` | `text-black` | `text-text` |
| `shared/TimelineItem.tsx:40` | `text-gray-600` | `text-text-muted` |
| `shared/TimelineItem.tsx:50` | `text-gray-600` | `text-text-muted` |
| `global/Footer.tsx:13` | `border-primary bg-background` | `border-accent bg-surface` |
| `global/Navbar/DesktopNavBar.tsx:19` | `border-primary bg-background/80` | `border-accent bg-surface/80` |
| `global/Navbar/DesktopNavBar.tsx:31` | `hover:text-black` | `hover:text-text` |
| `global/Navbar/DesktopNavBar.tsx:33` | `text-black` | `text-text` |
| `global/Navbar/DesktopNavBar.tsx:34` | `text-gray-600` | `text-text-muted` |
| `global/Navbar/DesktopNavBar.tsx:46,54,62` | `text-gray-600 hover:text-black` | `text-text-muted hover:text-text` |
| `global/Navbar/MobileNavBar.tsx:10` | `bg-black` | `bg-scrim` |
| `global/Navbar/MobileNavBar.tsx:44` | `border-primary bg-background` | `border-accent bg-surface` |
| `global/Navbar/MobileNavBar.tsx:176` | `bg-background` | `bg-surface` |
| `global/Navbar/MobileNavBar.tsx:179` | `text-black` | `text-text` |
| `global/Navbar/MobileNavBar.tsx:264,274,283,292` | `hover:text-gray-600` | `hover:text-text-muted` |
| `pages/home/ProjectListItem.tsx:15` | `hover:bg-gray-100/0` | `hover:bg-surface-raised/0` |
| `pages/home/ProjectListItem.tsx:48` | `text-gray-500` | `text-text-subtle` |
| `pages/page/Page.tsx:21` | `text-gray-900` | `text-text-strong` |
| `pages/people/Profile.tsx:73` | `bg-gray-600/70` | `bg-text-muted/70` |
| `pages/people/Profile.tsx:74` | `text-white` | `text-text-inverse` |
| `pages/people/Profile.tsx:85` | `text-gray-600` | `text-text-muted` |
| `pages/people/Profile.tsx:108,116` | `hover:text-blue-600` | `hover:text-link` |
| `pages/publications/Publication.tsx:89` | `text-blue-600` | `text-link` |
| `pages/contact/ErrorDialog.tsx:37` | `bg-black` | `bg-scrim` |
| `pages/contact/ErrorDialog.tsx:49` | `bg-background` | `bg-surface` |
| `pages/contact/ErrorDialog.tsx:53` | `text-gray-800` | `text-text-body` |
| `pages/contact/ErrorDialog.tsx:58` | `bg-gray-900 text-white` | `bg-surface-inverse text-text-inverse` |
| `pages/contact/ContactForm.tsx:136` | `text-gray-600` | `text-text-muted` |
| `pages/contact/ContactForm.tsx:152,166,179` | `border-gray-300 focus:border-gray-600` | `border-field focus:border-text-muted` |
| `pages/contact/ContactForm.tsx:186` | `bg-gray-900 text-white` | `bg-surface-inverse text-text-inverse` |
| `preview/PreviewBanner.tsx:10` | `bg-black text-white` | `bg-scrim text-text-inverse` |
| `app/layout.tsx:111` | `bg-background text-black dark:bg-black dark:text-white` | `bg-surface text-text` |
| `app/not-found.tsx:52` | `text-black hover:text-gray-600` | `text-text hover:text-text-muted` |

**Note the `app/layout.tsx:111` change:** the two `dark:` classes are **removed here**, not preserved. They are the vestigial no-op pair from design doc §1.4 — Task 3 reintroduces dark mode properly at the token layer, where it actually works. Removing them now keeps Task 1's zero-change claim true (they currently have no visible effect, as §1.4 verified) and stops Task 3 from having to reason about two competing mechanisms.

- [ ] **Step 4: Confirm no palette utility survives**

```bash
grep -rn --include='*.tsx' -E "bg-white|text-white|text-black|bg-gray-|text-gray-|bg-background|bg-black|border-gray-|text-blue-|bg-primary|border-primary|dark:" components app
```

Expected: **no output**. If anything remains, it was missed in Step 3 — add it to the table and fix it.

- [ ] **Step 5: Rebuild**

```bash
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

Expected: build succeeds, 20 routes generated, no new type or lint errors.

- [ ] **Step 6: Prove equivalence — the gate for this task**

Re-run Step 1's probe on all five routes. **Every value must match the saved baseline exactly.**

If any differs: do not adjust a hex to make it match. Find out why. The likely causes, in order: a class missed in Step 3 (re-run Step 4's grep); an opacity modifier applied to a token whose value came from a different source (`bg-surface/80`, `bg-text-muted/70`, `hover:bg-surface-raised/0`); or `@theme inline` not resolving as expected, in which case inject a probe element and read the custom property directly:

```js
getComputedStyle(document.documentElement).getPropertyValue('--sem-surface')  // ' #f8f8f8'
```

Also confirm the two opacity-modified cases specifically, since they compose a token with an alpha channel and are the most likely to break silently:

```js
JSON.stringify({
  navTranslucent: getComputedStyle(document.querySelector('nav')).backgroundColor, // expect rgba(248, 248, 248, 0.8)
})
```

**Finally, prove the `dark:` removal was a no-op for readers.** This task's equivalence claim is scoped to the light colour scheme. It deletes `dark:bg-black dark:text-white` from `app/layout.tsx`, which under `prefers-color-scheme: dark` did change `<body>`'s *own* computed style — but nothing visible followed from it, because `Layout`'s wrapper painted over it on every route (design doc §1.4). Confirm that by forcing dark mode in the browser and re-running the probe on `/`:

```js
// with prefers-color-scheme: dark forced
JSON.stringify({
  layoutBg:   getComputedStyle(document.querySelector('body > div.flex.min-h-screen')).backgroundColor,
  layoutText: getComputedStyle(document.querySelector('body > div.flex.min-h-screen')).color,
  h1:         getComputedStyle(document.querySelector('h1')).color,
})
```

Expected: identical to the light-mode values — `rgb(248, 248, 248)` / `rgb(13, 14, 18)` / `rgb(13, 14, 18)`. The page still renders (wrongly) light under dark mode; that is the pre-existing behaviour Task 3 fixes, and confirming it here is what proves this task changed nothing a reader could see. `<body>`'s own `backgroundColor` **will** differ from the baseline (it no longer goes dark) — that is the intended removal, not a regression, and it is the one value in this probe allowed to change.

- [ ] **Step 7: Verify, then commit**

```bash
npx tsc --noEmit && npx eslint . && npm test
```

Expected: all clean.

```bash
git add styles/index.css components app
git commit -m "refactor: introduce semantic colour tokens, value-preserving

Replaces every palette-shade utility (gray-*, blue-600, background,
primary, black, white) with a semantic token whose light value is
byte-identical to what it replaced. One token per distinct current
value -- consolidation is deliberately deferred so this commit's
computed styles can be diffed against the previous build and shown
to be unchanged.

Also removes the vestigial dark:bg-black/dark:text-white pair from
app/layout.tsx. It compiled but had no visible effect: Layout.tsx's
bg-background wrapper painted over it on every route. Task 3
reintroduces dark mode at the token layer, where it works."
```

---

## Task 2: Consolidate tokens and fix the contrast failure

**Files:**
- Modify: `styles/index.css`
- Modify: `components/shared/Header.tsx:27`, `components/pages/page/Page.tsx:21`, `components/pages/contact/ErrorDialog.tsx:53`, `components/pages/home/ProjectListItem.tsx:48`

**Interfaces:**
- Consumes: Task 1's semantic tokens.
- Produces: the final light token set. `--color-text-strong`, `--color-text-body`, `--color-text-subtle` no longer exist; every text role resolves to `text-text` or `text-text-muted`.

**The deliberate changes.** Unlike Task 1, these *do* change rendered output. All four are listed here, with the contrast maths (computed in code, design doc §1.5):

| Site | From | To | Ratio on `#f8f8f8` | Why |
|---|---|---|---|---|
| `ProjectListItem.tsx:48` | `text-text-subtle` `#727892` | `text-text-muted` `#515870` | **4.10 → 6.64** | 4.10 **fails** WCAG AA for normal text (needs 4.5). This is the `color-contrast` violation Phase 2C deferred to Phase 3. |
| `Header.tsx:27` | `text-text-strong` `#1b1d27` | `text-text` `#0d0e12` | 16.03 → 18.16 | Three near-identical near-blacks served one role. Consolidating removes a distinction no reader can see. |
| `Page.tsx:21` | `text-text-strong` `#1b1d27` | `text-text` `#0d0e12` | 16.03 → 18.16 | Same. |
| `ErrorDialog.tsx:53` | `text-text-body` `#252837` | `text-text` `#0d0e12` | 13.60 → 18.16 | Same. |

- [ ] **Step 1: Write the failing test**

The contrast rule is the thing worth locking down — it is the one that regresses silently. Create `styles/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Parses `--sem-*: #rrggbb;` declarations out of a named block of styles/index.css. */
function readTokens(blockSelector: string): Record<string, string> {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const start = css.indexOf(blockSelector)
  if (start === -1) throw new Error(`block not found: ${blockSelector}`)
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries(
    [...block.matchAll(/(--sem-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])
  )
}

describe('light theme tokens', () => {
  const t = readTokens(':root {')

  it('every text token meets WCAG AA on the page surface', () => {
    for (const name of ['--sem-text', '--sem-text-muted']) {
      expect(contrast(t[name], t['--sem-surface']), `${name} on --sem-surface`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('link colour meets WCAG AA on the page surface', () => {
    expect(contrast(t['--sem-link'], t['--sem-surface'])).toBeGreaterThanOrEqual(4.5)
  })

  it('accent meets WCAG AA for non-text (borders) on the page surface', () => {
    expect(contrast(t['--sem-accent'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('inverse text meets WCAG AA on both inverse surfaces', () => {
    expect(contrast(t['--sem-text-inverse'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--sem-text-inverse'], t['--sem-scrim'])).toBeGreaterThanOrEqual(4.5)
  })

  it('has dropped the consolidated tokens', () => {
    expect(t['--sem-text-strong']).toBeUndefined()
    expect(t['--sem-text-body']).toBeUndefined()
    expect(t['--sem-text-subtle']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run styles/tokens.test.ts
```

Expected: the `has dropped the consolidated tokens` case **FAILS** (all three are still defined after Task 1). The contrast cases should already pass — `--sem-text-subtle` is deliberately not asserted on, because it is about to be deleted rather than fixed.

- [ ] **Step 3: Repoint the four call sites**

- `components/pages/home/ProjectListItem.tsx:48`: `className="font-ariana text-text-subtle"` → `className="font-ariana text-text-muted"`
- `components/shared/Header.tsx:27`: `text-text-strong` → `text-text`
- `components/pages/page/Page.tsx:21`: `text-text-strong` → `text-text`
- `components/pages/contact/ErrorDialog.tsx:53`: `text-text-body` → `text-text`

- [ ] **Step 4: Remove the three now-unused tokens and the legacy palette block**

In `styles/index.css`, delete these three lines from the `@theme inline` block and their three `--sem-*` counterparts from `:root`:

```
--color-text-strong / --sem-text-strong
--color-text-body   / --sem-text-body
--color-text-subtle / --sem-text-subtle
```

Then delete the **entire original `@theme` palette block** (the one holding `--color-gray-50` through `--color-black`), and update the `@layer base` rule that referenced it:

```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-accent, currentColor);
  }

  button:not(:disabled),
  [role='button']:not(:disabled) {
    cursor: pointer;
  }
}
```

The `--font-*` declarations move into the surviving `@theme inline` block unchanged — they are not colours and must keep their exact current form. Phase 1C verified empirically that the apparently self-referential `--font-sans: var(--font-sans)` resolves correctly; **do not "fix" it**:

```css
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --font-antarctican: var(--font-antarctican-mono);
  --font-ariana: var(--font-ariana-pro);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run styles/tokens.test.ts
```

Expected: PASS, all five cases.

- [ ] **Step 6: Rebuild and confirm the intended changes, and only those**

```bash
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

In a real browser on `/`:

```js
JSON.stringify({
  projectOverview: getComputedStyle(document.querySelector('main .font-ariana')).color, // expect rgb(81, 88, 112)
  h1: getComputedStyle(document.querySelector('h1')).color,                             // expect rgb(13, 14, 18)
  border: getComputedStyle(document.querySelector('footer')).borderTopColor,            // expect rgb(45, 106, 79)
})
```

Then confirm the base-layer border default still resolves after the palette block's removal — this is exactly the class of regression Phase 1C's retrospective flagged (`extend.borderColor.DEFAULT` was a config key with no className anywhere):

```js
(() => {
  const el = document.createElement('div'); el.className = 'border'
  document.body.appendChild(el)
  const v = getComputedStyle(el).borderColor; el.remove(); return v  // expect rgb(45, 106, 79)
})()
```

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add styles/index.css components/shared/Header.tsx components/pages/page/Page.tsx \
        components/pages/contact/ErrorDialog.tsx components/pages/home/ProjectListItem.tsx \
        styles/tokens.test.ts
git commit -m "fix: consolidate text tokens and clear the WCAG AA contrast failure

ProjectListItem's overview text was gray-500 (#727892) on the site
background (#f8f8f8) -- 4.10:1, below AA's 4.5 for normal text. This
is the color-contrast violation Phase 2C deferred to Phase 3 as a
design-token decision. It now resolves to text-muted (#515870), 6.64:1.

Also folds three near-identical near-blacks (#1b1d27, #252837,
#0d0e12) into one text token, and deletes the inherited @sanity/demo
palette block now that nothing references it.

Adds styles/tokens.test.ts, which computes contrast ratios from the
stylesheet itself so a future token edit that breaks AA fails CI."
```

---

## Task 3: Make dark mode work

**Files:**
- Modify: `styles/index.css`
- Modify: `styles/tokens.test.ts`
- Create: `e2e/theme.spec.ts`

**Interfaces:**
- Consumes: Task 2's final light token set.
- Produces: a `@media (prefers-color-scheme: dark)` `:root` block redefining every `--sem-*`. No component changes — that is the point of the token layer.

**The dark palette.** Every value computed and contrast-checked in code, against both dark surfaces:

| Token | Dark value | vs `--sem-surface` `#0d0e12` | vs `--sem-surface-raised` `#1b1d27` |
|---|---|---|---|
| `--sem-surface` | `#0d0e12` | — | — |
| `--sem-surface-raised` | `#1b1d27` | — | — |
| `--sem-surface-inverse` | `#f6f6f8` | — | — |
| `--sem-scrim` | `#0d0e12` | — | — |
| `--sem-text` | `#f6f6f8` | **17.87** | **15.54** |
| `--sem-text-muted` | `#bbbdc9` | **10.32** | **8.98** |
| `--sem-text-inverse` | `#0d0e12` | — | — |
| `--sem-link` | `#9da2f2` | **8.16** | **7.10** |
| `--sem-accent` | `#4e9a79` | **5.72** | — |
| `--sem-field` | `#515870` | (border, non-text) | — |
| `--sem-rule` | `#252837` | (divider, non-text) | — |

Note `--sem-surface-inverse` and `--sem-text-inverse` **swap** in dark mode: the submit button is a light block on a dark page, mirroring the dark block on a light page. `--sem-scrim` stays `#0d0e12` — a backdrop is dark in both schemes.

- [ ] **Step 1: Extend the token test to cover the dark block**

Append to `styles/tokens.test.ts`:

```ts
describe('dark theme tokens', () => {
  const t = readTokens('@media (prefers-color-scheme: dark)')

  it('defines every token the light theme defines', () => {
    const light = Object.keys(readTokens(':root {')).sort()
    expect(Object.keys(t).sort()).toEqual(light)
  })

  it('every text token meets WCAG AA on both dark surfaces', () => {
    for (const name of ['--sem-text', '--sem-text-muted', '--sem-link']) {
      expect(contrast(t[name], t['--sem-surface']), `${name} on surface`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t[name], t['--sem-surface-raised']), `${name} on raised`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('accent meets WCAG AA for non-text on the dark surface', () => {
    expect(contrast(t['--sem-accent'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('inverse text meets WCAG AA on the inverse surface', () => {
    expect(contrast(t['--sem-text-inverse'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)
  })
})
```

`readTokens` slices to the first `}` after the block marker. The dark block is `@media (…) {` followed by `:root {`, so the first `}` closes `:root` — which is exactly the range wanted. Verify this holds when you write the CSS in Step 3; if the parse returns an empty object, the test will fail loudly on the first case rather than silently passing.

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run styles/tokens.test.ts
```

Expected: FAIL — `block not found: @media (prefers-color-scheme: dark)`.

- [ ] **Step 3: Add the dark block**

In `styles/index.css`, immediately after the `:root { … }` light block:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --sem-surface: #0d0e12;
    --sem-surface-raised: #1b1d27;
    --sem-surface-inverse: #f6f6f8;
    --sem-scrim: #0d0e12;
    --sem-text: #f6f6f8;
    --sem-text-muted: #bbbdc9;
    --sem-text-inverse: #0d0e12;
    --sem-link: #9da2f2;
    --sem-accent: #4e9a79;
    --sem-field: #515870;
    --sem-rule: #252837;
  }
}
```

Also add a `color-scheme` declaration to the light `:root` block so form controls, scrollbars, and the browser's own UI follow the theme:

```css
:root {
  color-scheme: light dark;
  --sem-surface: #f8f8f8;
  /* …rest unchanged… */
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run styles/tokens.test.ts
```

Expected: PASS, all nine cases across both describes.

- [ ] **Step 5: Write the end-to-end regression guard**

This is the test that would have caught §1.4's bug. Create `e2e/theme.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/people', '/publications', '/contact', '/tutorial']

/** Parses `rgb(r, g, b)` / `rgba(r, g, b, a)` into a 0-255 triple. */
function rgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) throw new Error(`unparseable colour: ${value}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

const mean = (c: [number, number, number]) => (c[0] + c[1] + c[2]) / 3

test.describe('dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  for (const route of ROUTES) {
    test(`${route} renders dark, with no light surface painting over it`, async ({ page }) => {
      await page.goto(route)

      // The Layout wrapper is the element that masked the dark body before
      // Phase 3A -- it is the specific regression this asserts against.
      const wrapper = page.locator('body > div').first()
      const wrapperBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)
      const wrapperText = await wrapper.evaluate((el) => getComputedStyle(el).color)

      expect(mean(rgb(wrapperBg)), `${route} wrapper background should be dark`).toBeLessThan(60)
      expect(mean(rgb(wrapperText)), `${route} wrapper text should be light`).toBeGreaterThan(180)

      const headingColor = await page
        .locator('h1')
        .first()
        .evaluate((el) => getComputedStyle(el).color)
      expect(mean(rgb(headingColor)), `${route} h1 should be light`).toBeGreaterThan(180)
    })
  }
})

test.describe('light colour scheme', () => {
  test.use({ colorScheme: 'light' })

  test('/ renders light', async ({ page }) => {
    await page.goto('/')
    const wrapper = page.locator('body > div').first()
    const bg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(mean(rgb(bg))).toBeGreaterThan(200)
  })
})
```

- [ ] **Step 6: Run it and confirm both schemes**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
npx playwright test e2e/theme.spec.ts
```

Expected: 6 passed (5 dark routes + 1 light).

Then confirm by eye, because a numeric threshold cannot tell you whether the result is *legible*. Serve the build, force dark mode in the browser, and look at `/`, `/people`, `/publications`, `/contact`. Specifically check the two composed-opacity surfaces, which the numeric test does not cover: the translucent nav (`bg-surface/80`) and the Profile bio overlay (`bg-text-muted/70` — only visible if a profile has a bio; none do today, so inject one via devtools or accept that it is untested and say so).

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add styles/index.css styles/tokens.test.ts e2e/theme.spec.ts
git commit -m "feat: make dark mode actually work, via the token layer

Before this, dark mode compiled but was a no-op: app/layout.tsx set
dark:bg-black on <body>, and Layout.tsx's unconditioned bg-background
wrapper painted straight over it, so a dark-mode screenshot was
pixel-identical to light. Verified empirically before the fix --
body rgb(13,14,18), wrapper rgb(248,248,248) on every route.

Repointing the --sem-* custom properties under a prefers-color-scheme
media query themes the whole site without a single dark: variant,
because Task 1 already routed every component through them.

e2e/theme.spec.ts asserts, per route, that the wrapper is actually
dark and the text actually light -- the assertion that would have
caught the original bug."
```

---

## Task 4: Correct `sizes` on every image call site

**Files:**
- Modify: `components/shared/ImageBox.tsx:19`, `components/shared/ImageContainer.tsx:21`
- Modify: `components/pages/people/Profile.tsx:59-65`, `components/pages/home/ProjectListItem.tsx:22-26`, `components/pages/project/ProjectPage.tsx:39-43`

**Interfaces:**
- Consumes: nothing from Tasks 1–3.
- Produces: no new API. `ImageBox`/`ImageContainer` keep the same `size?: string` prop; the default becomes accurate rather than universal.

**The defect** (design doc §1.2): both components default `size = '100vw'` and **no call site overrides it**, so every image on the site declares `sizes="100vw"`. On `/people` that means 325 CSS px grid cells causing the browser to select the **3840w** candidate at dpr 2.

**The layouts, read off the actual markup:**

| Call site | Rendered width | Correct `sizes` |
|---|---|---|
| `Profile.tsx` — `People.tsx:18` grid is `grid-cols-1 md:grid-cols-3` inside `Layout`'s `md:px-16 lg:px-32` | full width < 768px; ~⅓ above | `(min-width: 768px) 33vw, 100vw` |
| `ProjectListItem.tsx` — `w-full md:w-7/12 lg:w-8/12` | full width < 768px; 58% at md; 67% at lg | `(min-width: 1024px) 67vw, (min-width: 768px) 58vw, 100vw` |
| `ProjectPage.tsx` — cover image, full content width | full content width | `100vw` (correct as-is, but state it explicitly) |
| `ImageContainer` — body-content images in `CustomPortableText` | content column | `(min-width: 768px) 66vw, 100vw` |

- [ ] **Step 1: Make the default honest**

In `components/shared/ImageBox.tsx`, change the `size` default and document why a caller must think about it:

```ts
export default function ImageBox({
  image,
  alt = 'Cover image',
  width = 3500,
  height = 2000,
  // Callers render this component at widely different widths (a full-bleed
  // project cover vs. a one-third-width profile card). `100vw` is only correct
  // for the full-bleed case and makes every other call site download a far
  // larger candidate than it can display -- a 325px People card was selecting
  // the 3840w image. Pass the real layout.
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
```

Apply the identical comment and signature to `components/shared/ImageContainer.tsx`.

- [ ] **Step 2: Pass real values at each call site**

`components/pages/people/Profile.tsx` — add `size` to the existing `<ImageBox>`:

```tsx
        <ImageBox
          image={profile.image}
          width={800}
          height={800}
          size="(min-width: 768px) 33vw, 100vw"
          alt={`Profile image of ${profile.name}`}
          classesWrapper="relative aspect-[1/1]"
        />
```

`components/pages/home/ProjectListItem.tsx`:

```tsx
        <ImageBox
          image={project.coverImage}
          alt={`Cover image from ${project.title}`}
          size="(min-width: 1024px) 67vw, (min-width: 768px) 58vw, 100vw"
          classesWrapper="relative aspect-[16/9] h-full h-full "
        />
```

`components/pages/project/ProjectPage.tsx`:

```tsx
            <ImageBox
              image={coverImage}
              alt={`Cover image for ${title}`}
              size="100vw"
              classesWrapper="relative aspect-[16/9]"
            />
```

`components/shared/CustomPortableText.tsx:134-137` — the `<ImageContainer>` inside the `image` renderer:

```tsx
            <ImageContainer
              image={value}
              alt={value.alt || value.caption || ''}
              size="(min-width: 768px) 66vw, 100vw"
            />
```

- [ ] **Step 3: Rebuild and measure**

```bash
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

In a real browser on `/people`, after images settle:

```js
(async () => {
  await new Promise(r => setTimeout(r, 1500))
  return JSON.stringify([...document.querySelectorAll('img')]
    .filter(i => /Profile image/.test(i.alt)).slice(0, 3)
    .map(i => ({
      cssWidth: Math.round(i.getBoundingClientRect().width),
      chosenCandidate: i.currentSrc.match(/[?&]w=(\d+)/)?.[1],
      sizes: i.sizes,
    })), null, 2)
})()
```

Expected: `sizes` is `(min-width: 768px) 33vw, 100vw`, and `chosenCandidate` is now a value proportionate to a ~325 px box at the current dpr (640 or 750 at dpr 2), **not 3840**. Record the before (3840) and after values for the PR description.

Repeat on `/` for the project cards, expecting a candidate proportionate to ~58–67vw rather than 3840.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add components/shared/ImageBox.tsx components/shared/ImageContainer.tsx \
        components/pages/people/Profile.tsx components/pages/home/ProjectListItem.tsx \
        components/pages/project/ProjectPage.tsx components/shared/CustomPortableText.tsx
git commit -m "perf: declare real sizes at every image call site

Both ImageBox and ImageContainer defaulted size to 100vw and no
caller overrode it, so every image on the site claimed full-viewport
width. On /people that meant 325px grid cells selecting the 3840w
candidate at dpr 2.

Phase 2's exit criteria claimed 'sizes reflects actual rendered
layout'; for these two components it did not. Each call site now
declares its real layout."
```

---

## Task 5: Name the type scale and kill the dead `text-md` class

**Files:**
- Modify: `styles/index.css`
- Modify: `components/pages/project/ProjectPage.tsx:46,53,63,74`

**Interfaces:**
- Consumes: nothing from Tasks 1–4.
- Produces: named type-role tokens (`--text-display`, `--text-title`, `--text-lead`, `--text-body`, `--text-meta`) that 3C's Publications and People redesigns reference instead of picking a raw `text-*` step each time.

**The defect.** `text-md` **is not a Tailwind class.** Tailwind's scale runs `text-sm` → `text-base` → `text-lg`; there is no `md` step. All four usages compile to nothing — verified against the real build: `.text-lg{…}` is present in `.next/static/chunks/*.css`, `.text-md` is absent from every chunk. The intent at each site was clearly "one step below `text-lg` on mobile, `text-lg` above", so the elements currently inherit their parent size below the `md` breakpoint. This is the same failure mode as Phase 1C's `bg-opacity-70` regression: a class that reads as meaningful and silently does nothing.

**Scope limit — deliberate.** This task does **not** restyle the site's typography. Design doc §1.5 raises a real question — the body font is Antarctican **Mono**, so every heading and all body copy is set in a monospace — and explicitly says it is "worth an explicit decision rather than inheritance." That decision belongs to the lab (it is the site's visual identity, and §2.2 makes identity the axis this site is judged on), not to an implementation task. **This task names the existing sizes into a scale without changing any rendered size, and leaves the font-family question open.** Raise it in the PR description as a decision for Phase 3C or a follow-up.

- [ ] **Step 1: Add the type-role tokens**

Tailwind 4's default `--text-*` steps stay as they are. Add semantic *roles* on top, in the `@theme inline` block in `styles/index.css`, mapping to the steps already in use:

```css
  /* Type roles. Values are Tailwind's existing steps -- this names the scale
     the site already uses so components stop picking raw steps ad hoc. It
     deliberately does not change any rendered size. */
  --text-display: var(--text-3xl);   /* page <h1> — with md:text-5xl at the call site */
  --text-title: var(--text-xl);      /* card and item titles */
  --text-lead: var(--text-lg);       /* intro/description copy */
  --text-body: var(--text-base);     /* body copy */
  --text-meta: var(--text-sm);       /* captions, roles, metadata */
```

- [ ] **Step 2: Replace the dead class with the role it meant**

`components/pages/project/ProjectPage.tsx` — all four sites meant "body size on mobile, `lg` above". Replace `text-md` with `text-body`:

- line 46: `<div className="text-body md:text-lg">{`${startYear} -  ${endYear}`}</div>`
- line 53: `<div className="text-body md:text-lg">{category}</div>`
- line 63: `className="text-body break-words hover:underline md:text-lg"`
- line 74: `<div className="text-body flex flex-row flex-wrap md:text-lg">`

- [ ] **Step 3: Confirm the class now compiles**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build
find .next -name '*.css' -path '*static*' -print0 | while IFS= read -r -d '' f; do
  grep -o '\.text-body{[^}]*}' "$f"
done
```

Expected: at least one match, e.g. `.text-body{font-size:var(--text-body);…}`. Before this task the equivalent grep for `.text-md` returned nothing on every chunk — that is the regression being closed.

- [ ] **Step 4: Confirm the rendered change is the intended one**

```bash
(npm run start -- -p 3210 &)
```

In a real browser on `/projects/glial-activity-as-a-marker-of-disease`, at a **mobile** viewport (375px, below the `md` breakpoint, where the dead class was actually costing something):

```js
JSON.stringify([...document.querySelectorAll('main .text-body')]
  .slice(0, 4).map(el => getComputedStyle(el).fontSize))
```

Expected: `16px` on each (`--text-base`). Before this task these elements inherited their parent's size instead. Confirm at desktop (1280px) that they read `18px` (`md:text-lg`) — unchanged from before, since `md:text-lg` always worked.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add styles/index.css components/pages/project/ProjectPage.tsx
git commit -m "fix: replace the non-existent text-md class, and name the type scale

text-md is not a Tailwind class -- the scale runs sm/base/lg with no
md step -- so all four usages in ProjectPage compiled to nothing and
those elements inherited their parent size below the md breakpoint.
Verified against the real build: .text-lg is present in the compiled
chunks, .text-md is absent from all of them. Same failure mode as
Phase 1C's bg-opacity-70.

Also names the type steps already in use into display/title/lead/
body/meta roles, so Phase 3C's redesigns reference roles rather than
picking raw steps. No rendered size changes.

The larger typography question design doc 1.5 raises -- whether the
body font should remain a monospace -- is deliberately left open;
it is a visual-identity decision for the lab, not an implementation
detail."
```

---

## Task 6: Consolidate spacing into a layout scale

**Files:**
- Modify: `styles/index.css`
- Modify: `components/shared/Layout.tsx:18-31`, `components/pages/people/People.tsx:16-19`, `components/pages/publications/Publications.tsx:16`

**Interfaces:**
- Consumes: Tasks 1–3's token layer; Task 5's `@theme inline` block (add to the same block).
- Produces: a single owner for page gutters and content rhythm. Later phases (3C's People and Publications redesigns) inherit it instead of re-adding `px-4 md:px-0`.

**The defect** (design doc §1.5): spacing is ad-hoc and double-applied. `Layout.tsx:26` sets `mt-32 flex-grow md:mt-16 md:px-16 lg:px-32` plus a `childrenStyles` default of `px-6`, and then `People.tsx:16` and `Publications.tsx` re-add their own `px-4 md:px-0` on top of it — two components independently compensating for the same wrapper.

- [ ] **Step 1: Define the scale**

Tailwind 4 generates its numeric spacing scale from a single `--spacing` base, which stays at its default. What is missing is *named layout* values. Add to the `@theme inline` block in `styles/index.css`:

```css
  /* Page gutters. One owner: Layout. Page components must not re-add
     horizontal padding -- People and Publications previously did, producing
     doubled gutters at some breakpoints. */
  --spacing-gutter: 1.5rem;
  --spacing-gutter-md: 4rem;
  --spacing-gutter-lg: 8rem;
```

These reproduce the current effective values (`px-6` = 1.5rem, `md:px-16` = 4rem, `lg:px-32` = 8rem), so this step alone changes nothing.

- [ ] **Step 2: Make Layout the single owner of gutters**

`components/shared/Layout.tsx` — replace the `childrenStyles` escape hatch with the named scale. The prop is kept (it is part of the component's public shape and `Layout` has several callers) but now defaults to empty:

```tsx
export default function Layout({
  children,
  settings = fallbackSettings,
  childrenStyles = '',
}: LayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-surface text-text`}>
      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications ?? true}
        showPeople={settings?.showPeople ?? true}
        showContactForm={settings?.showContactForm ?? true}
      />

      <main
        className={`mt-32 flex-grow px-gutter md:mt-16 md:px-gutter-md lg:px-gutter-lg ${childrenStyles}`}
      >
        {children}
      </main>

      <Footer footer={settings?.footer} />
    </div>
  )
}
```

- [ ] **Step 3: Remove the double-applied gutters**

`components/pages/people/People.tsx` — drop `px-4 md:px-0` from both the heading and the grid:

```tsx
      <h1 className="mb-6 text-3xl font-black md:text-5xl">People</h1>
      <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
```

`components/pages/publications/Publications.tsx:16` — the `<h1>` already has no horizontal padding; confirm by reading the file and remove any `px-*` if present.

- [ ] **Step 4: Fix the ordered-list bug while in this file**

`styles/index.css` currently ends with:

```css
ol,
ul {
  margin-left: 1rem;
}

ol {
  list-style-type: disc;
}
```

`ol { list-style-type: disc }` renders every ordered list with bullets — any numbered list authored in a Sanity `page` body is currently wrong. Replace both rules with:

```css
ol,
ul {
  margin-left: 1rem;
}

ul {
  list-style-type: disc;
}

ol {
  list-style-type: decimal;
}
```

- [ ] **Step 5: Rebuild and verify layout is unchanged where it should be, fixed where it should not**

```bash
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

In a real browser, compare `/` (which never double-applied) against `/people` (which did):

```js
JSON.stringify({
  mainPadding: getComputedStyle(document.querySelector('main')).paddingLeft,
  h1Left: document.querySelector('h1').getBoundingClientRect().left,
})
```

Expected on a desktop viewport: `mainPadding` is `128px` (`lg:px-gutter-lg` = 8rem) on both routes, and `h1Left` is now **identical** across `/` and `/people` — before this task `/people`'s heading sat 16px further in from the extra `px-4`. Also check a mobile viewport (375px): `mainPadding` `24px`, headings aligned.

Then confirm the list fix on `/tutorial`, which has authored body content:

```js
[...document.querySelectorAll('main ol, main ul')].slice(0,4)
  .map(el => el.tagName + ': ' + getComputedStyle(el).listStyleType)
// expect OL: decimal, UL: disc
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add styles/index.css components/shared/Layout.tsx components/pages/people/People.tsx \
        components/pages/publications/Publications.tsx
git commit -m "refactor: give page gutters one owner, and fix ordered-list markers

Layout set px-6/md:px-16/lg:px-32 and People and Publications each
re-added px-4 md:px-0 on top, so headings on those routes sat at a
different indent from every other route. Gutters are now named tokens
owned solely by Layout.

Also fixes 'ol { list-style-type: disc }', which rendered every
authored ordered list with bullets."
```

---

## Task 7: Shrink the axe allowlist and run the full verification sweep

**Files:**
- Modify: `e2e/axe.spec.ts:24-31`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: the phase's exit evidence.

- [ ] **Step 1: Reconcile the allowlist comment**

> **Plan correction, recorded 2026-08-11.** This step originally read "Remove the resolved violation," on the assumption that the allowlist could stay stale between Task 2 and here. It cannot: `e2e/axe.spec.ts` asserts that every id listed in `KNOWN_VIOLATIONS` **still fires**, so the moment Task 2's contrast fix landed, leaving `'/': ['color-contrast']` in place broke the e2e suite. Task 2's implementer found this by running Playwright beyond its brief and removed the entry there, correctly — deferring would have left CI red across four tasks. The entry is therefore **already gone** by the time you reach this step.
>
> Your job here is reconciliation, not removal: confirm the map matches the target below, and bring the explanatory comment up to the fuller form specified here (Task 2's version is terser). If the map already matches and the comment already carries this content, say so and change nothing.

`e2e/axe.spec.ts` — `KNOWN_VIOLATIONS` should read:

```ts
// `/` previously carried a `color-contrast` violation (ProjectListItem's
// overview text, gray-500 #727892 on #f8f8f8 = 4.10:1, below AA's 4.5).
// Phase 2C deferred it here as a design-token decision; Phase 3A Task 2
// resolved it by repointing that text to the muted token (6.64:1).
//
// `/tutorial`'s heading-order violation remains and is deliberately not
// fixed: it is authored Sanity content, not a component defect. Fixing it
// means editing live CMS content or making CustomPortableText enforce
// sequential heading order programmatically -- a distinct, larger change.
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  '/': [],
  '/contact': [],
  '/people': [],
  '/publications': [],
  '/tutorial': ['heading-order'],
  '/projects/publication-highlights': [],
}
```

- [ ] **Step 2: Run the axe suite**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
npx playwright test e2e/axe.spec.ts
```

Expected: 12 passed (6 routes × 2 viewports). If `/` still reports `color-contrast`, Task 2's fix did not land on the element axe is measuring — find the actual failing node from the axe output rather than re-adding the allowlist entry.

Note that this suite fails in **both** directions by design: a violation that fires but is not listed, and a listed violation that no longer fires. The second is the one that bit this plan (Step 1's correction note).

- [ ] **Step 3: Run everything**

```bash
npx tsc --noEmit
npx eslint .
npm test
npm run build
npm run test:e2e
```

Expected: all green. `npm test` includes `styles/tokens.test.ts` (9 cases) alongside the existing `groupByYear`, `json-ld`, `metadata`, `site`, `sanity.links`, `revalidate`, and contract tests. `npm run test:e2e` includes the new `theme.spec.ts`.

- [ ] **Step 4: Confirm the TypeGen check will pass**

No task in this plan touched `schemas/`, so `sanity.types.ts` must be unchanged:

```bash
npm run typegen && git diff --exit-code sanity.types.ts
```

Expected: no diff, exit 0. If there is a diff, something modified the schema — investigate before committing.

- [ ] **Step 5: Final visual review against the standard that actually matters**

Per design doc §5, 3A's subjective half cannot be settled by a diff. Serve the build and capture `/`, `/people`, `/publications`, `/contact` in **both** colour schemes at desktop (1280) and mobile (375) — eight screenshots. Attach them to the PR alongside the Wix site (`https://damianholsinger6.wixsite.com/holsinger-lab`) for the side-by-side comparison §2.2 makes the acceptance criterion.

- [ ] **Step 6: Commit**

```bash
git add e2e/axe.spec.ts
git commit -m "test: drop the resolved color-contrast entry from the axe allowlist

/ no longer carries a color-contrast violation -- Task 2 repointed
ProjectListItem's overview text from 4.10:1 to 6.64:1. /tutorial's
heading-order entry stays, with its rationale recorded inline."
```

**Exit criteria for Phase 3A:** `tsc --noEmit`, `eslint .`, `npm test`, `npm run build`, and `npm run test:e2e` all green. No component references a palette shade or raw colour. Every text/background pair meets WCAG AA in both schemes, asserted from the stylesheet in `styles/tokens.test.ts`. Dark mode renders dark on every route, asserted per-route in `e2e/theme.spec.ts`. No image declares `sizes="100vw"` unless it is genuinely full-bleed. Type roles are named and no dead `text-md` class survives. Page gutters have one owner. `KNOWN_VIOLATIONS` contains exactly one entry (`/tutorial` → `heading-order`).

**Carried out of Phase 3A as open decisions, not omissions:** whether the body font should remain a monospace (Task 5), and the two live-deploy-dependent manual checks (Global Constraints). Both belong in the PR description.

---

## Notes for the whole-branch reviewer

Three things worth checking that the per-task reviews are structurally unlikely to catch, following Phase 1C's retrospective (a token-name grep over markup is necessary but not sufficient):

1. **Diff the deleted palette block key-by-key against the new token set.** Task 2 deletes the entire `@theme` palette. Phase 1C shipped a regression precisely here — `extend.borderColor.DEFAULT` was a config key with no className anywhere, silently applied by preflight to every bare `border` utility. Task 2 Step 6 probes the bare-`border` case specifically; check nothing else in the deleted block had a preflight consumer.
2. **Check opacity-modified utilities separately.** `bg-surface/80`, `bg-text-muted/70`, `hover:bg-surface-raised/0` compose a token with an alpha channel. Tailwind 4 handles this via `color-mix()`, which behaves differently from v3's `--tw-*-opacity` mechanism. These are the most likely silent breakage and are not covered by the numeric dark-mode thresholds.
3. **The Profile bio overlay (`bg-text-muted/70`) is untestable against real data** — zero of 19 profiles have a bio (design doc §1.2), so the overlay never renders. Confirm Task 3 Step 6 says so explicitly rather than claiming it was verified.
