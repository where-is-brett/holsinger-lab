# Phase 1C — Tailwind 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump `tailwindcss` 3.3.2 → 4.3.3, move `styles/index.css` from the `@tailwind` directive form to v4's CSS-first `@import "tailwindcss"` + `@theme` form carrying the lab's actual colour/font tokens, then delete `tailwind.config.js` and the `@sanity/demo` dependency it existed only to feed — with **zero rendered-output change** anywhere on the site.

**Architecture:** One task. Every sub-change here — the dependency bump, the `@theme` token values, the config deletion — is one coupled unit: the config can't go until the tokens it carried are ported, and the tokens can't be verified except by building with the new dependency in place. Splitting it would just create an intermediate commit that doesn't build cleanly. This mirrors how Phase 1A bundled its 17-package removal into a single task.

**Tech Stack:** `tailwindcss` 4.3.3, `@tailwindcss/postcss` 4.3.3 (new). `postcss` (`^8.4.24`), `autoprefixer`, and `prettier-plugin-tailwindcss` (`^0.3.0`) are untouched — see Global Constraints for why.

## Global Constraints

- **Every step ends with `npx tsc --noEmit`, `npx eslint .`, and `npm run build` green**, run with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` (public values, not secrets — see `.github/workflows/ci.yml`). `npm run build` needs real network access to `*.api.sanity.io`.
- **No behavioural change of any kind.** This is a pure dependency/config migration. If the verification in Step 6 finds a rendered difference, that is a bug in this task's implementation, not an acceptable side effect to wave through.
- **The parent design doc's §2.1 hex table is wrong — do not use it.** `docs/superpowers/specs/2026-08-09-phase-1-foundations-design.md` §2.1 lists `gray-600: #6e7683`, `blue-600: #1e61cd`, etc., sourced from `@sanity/color`'s published documentation. That is not what's actually compiled. `tailwind.config.js`'s top-level `theme: { ...theme, ... }` spread (from `@sanity/demo/tailwind`) replaces Tailwind's default `colors.gray`/`colors.blue` scales with `@sanity/demo`'s own, which resolve to different real hex values. **Verified 2026-08-10 by building `main` at `cae3fb9` and reading the actual compiled CSS** (`.next/static/chunks/*.css`, the ~28 KB chunk containing `bg-background`) **and cross-checking with `getComputedStyle` in a real browser against a running `next start`.** The table in Step 1 below is the one to use. This includes catching and fixing one arithmetic slip of my own along the way (an early manual hex conversion of `rgb(114 120 146)` came out as `#728192` instead of the correct `#727892` — caught only because the computed-style check disagreed with the hand-converted hex, not by inspection). **Trust the browser-verified numbers below, not any hand conversion — redo the conversion in code/the browser if you doubt a value, don't eyeball it.**
- **A literal text diff of the compiled CSS will *not* be empty, and that's expected, not a bug.** Tailwind v4 restructures everything: colours become `var(--color-gray-500)` references into a real `:root` custom-property block instead of v3's `rgb(114 120 146/var(--tw-text-opacity))` inline values; there's a `@layer theme`/`@layer base`/`@layer utilities` structure that didn't exist before; even the font-family declarations gain one more layer of `var()` indirection (v4 emits `.font-antarctican{font-family:var(--font-antarctican)}` plus a separate `--font-antarctican: var(--font-antarctican-mono)` declaration, where v3 inlined `.font-antarctican{font-family:var(--font-antarctican-mono)}` directly). **"The diff should be empty" (parent design doc §5) means the *resolved* value of every utility class actually in use is unchanged — verify that with `getComputedStyle` in a real browser (Step 6), not with `diff` on the raw CSS text.**
- **The font tokens that share a name with their own CSS variable are safe — verified empirically, not reasoned from the CSS spec.** `sans`, `mono`, and `serif` map to `var(--font-sans)` / `var(--font-mono)` / `var(--font-serif)` — i.e., the *same name* as the theme token itself, which under Tailwind v4's CSS-variable-based `@theme` system looks like a self-referential cycle (`--font-mono: var(--font-mono)`), and per the CSS custom-properties spec, cyclic references are invalid at computed-value time. Reasoning about which declaration wins the cascade (a `@theme`-emitted `:root` rule vs. next/font's per-page class on `<html>`) requires knowing whether Tailwind wraps its theme output in a cascade layer that would out-rank the unlayered next/font rule regardless of source order — **this was tested directly rather than derived**: built with the naive pass-through values, served with `next start`, and read `getComputedStyle(document.documentElement).fontFamily` and injected-element font-family for `.font-serif` in a real browser. Every one resolved correctly (real font, not a fallback). Preflight's `html{font-family:...}` and `code,kbd,samp,pre{font-family:...}` rules were also confirmed to correctly track the customized `--font-sans`/`--font-mono` tokens via Tailwind v4's own internal `--default-font-family`/`--default-mono-font-family` indirection — this is Tailwind v4 behavior, not something this task wires up by hand. **Do not "fix" the apparent self-reference by renaming variables or restructuring the CSS** — the naive direct port in Step 4 is the verified-correct one.
- **`postcss`, `autoprefixer`, and `prettier-plugin-tailwindcss` are deliberately left at their current versions.** `@tailwindcss/postcss@4.3.3` declares its own `postcss: ^8.5.16` as a regular (non-peer) dependency and installs its own nested copy — verified via `npm install -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3` against the existing `postcss: ^8.4.24`: no `ERESOLVE`, no warning. Bumping the root `postcss` devDependency isn't required. `autoprefixer` is kept running rather than removed (Tailwind v4's own Lightning-CSS-based prefixing only covers rules *it* generates, not the hand-written CSS at the bottom of `styles/index.css`) — removing it would be an extra variable in a task whose entire point is a zero-diff migration, and the compiled output shows it isn't currently adding anything beyond what's already hand-prefixed anyway, so there's nothing to gain. `prettier-plugin-tailwindcss@0.3.0` predates v4 class-sorting support and reads `tailwind.config.js`, which this task deletes — it may silently stop sorting classes in `npm run format`. This isn't CI-gated (`.github/workflows/ci.yml` runs `type-check`, `lint`, the TypeGen freshness check, and `build` — no `format` step) and isn't in the parent design doc's Phase 1C scope, so it's left alone. Spot-check it doesn't hard-error (Step 7) but don't fix it if it does.
- **Two items the Phase 1B whole-branch review surfaced are explicitly deferred to Phase 2, not absorbed here:** (1) reconciling `sanity.types.ts` (TypeGen-generated) against the hand-written payload types in `types/index.ts`, currently papered over with `as` casts in six App Router route files — this is a CMS-typing concern touching files this task never opens, unrelated to CSS. (2) The two unchecked manual post-deploy items from the Phase 1B PR's test plan (confirming the Sanity webhook hits `/api/revalidate` with `SANITY_WEBHOOK_SECRET`, and confirming `VisualEditing` overlays render against a real draft-mode session) — these need live deploy/token access this sandboxed environment doesn't have, and no version bump in this task changes that. Carry both forward in the PR description.

---

## Task 1: Migrate to Tailwind 4 — CSS-first theme, delete legacy config and `@sanity/demo`

**Files:**
- Modify: `package.json`
- Modify: `postcss.config.js`
- Modify: `styles/index.css`
- Delete: `tailwind.config.js`

**Interfaces:** None — this task has no consumers within the plan; it's the only task.

**Verified reference table** (measured 2026-08-10 against `main` @ `cae3fb9`, built with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production`, read via `getComputedStyle` in a real browser against a running `next start`):

| Utility / token | Resolved value (rgb or font stack) | Hex (colours) |
|---|---|---|
| `bg-gray-50` | `rgb(246, 246, 248)` | `#f6f6f8` |
| `bg-gray-100` (only used as `hover:bg-gray-100/0`, alpha 0) | `rgb(238, 238, 241)` | `#eeeef1` |
| `bg-gray-200` | `rgb(227, 228, 232)` | `#e3e4e8` |
| `border-gray-300` | `rgb(187, 189, 201)` | `#bbbdc9` |
| `text-gray-500` | `rgb(114, 120, 146)` | `#727892` |
| `bg-gray-600` / `text-gray-600` / `focus:border-gray-600` / `hover:text-gray-600` | `rgb(81, 88, 112)` | `#515870` |
| `text-gray-800` | `rgb(37, 40, 55)` | `#252837` |
| `bg-gray-900` / `text-gray-900` | `rgb(27, 29, 39)` | `#1b1d27` |
| `text-blue-600` / `hover:text-blue-600` | `rgb(64, 67, 231)` | `#4043e7` |
| `bg-background` | `rgb(248, 248, 248)` | `#f8f8f8` |
| `border-primary` | `rgb(45, 106, 79)` | `#2d6a4f` |
| `html` element `font-family` (the `sans` token) | `antarcticanMono, "antarcticanMono Fallback"` | — |
| `.font-antarctican` | `antarcticanMono, "antarcticanMono Fallback"` | — |
| `.font-ariana` | (next/font-generated `arianaPro` stack) | — |
| `.font-serif` | `"PT Serif", "PT Serif Fallback"` | — |
| `<code>`/`<kbd>`/`<pre>`/`<samp>` `font-family` (the `mono` token, e.g. the literal `<code>` on `/tutorial`) | `"IBM Plex Mono", "IBM Plex Mono Fallback"` | — |

This is the complete, exhaustive list of every class using `gray-*`/`blue-*`/`background`/`primary`/custom font tokens anywhere in the codebase — confirmed by grepping every `.tsx`/`.ts` file for those token families with no prefix assumptions (checked `bg-`/`text-`/`border-`/`ring-`/`divide-`/`from-`/`to-`/`via-` and `hover:`/`focus:`/`group-hover:`/etc. combinations). `gray-100`, `gray-400`, `gray-700`, and every other unused shade are correctly absent from this list and from the `@theme` block below — don't add them.

- [ ] **Step 1: Reproduce the baseline independently**

Confirm the reference table above against your own build before changing anything — this is cheap insurance, and it's the audit trail for this task's own commit.

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next
npm run build
```

Expected: build succeeds, all 20 pages generate, no TypeScript/ESLint errors surfaced during the build.

- [ ] **Step 2: Bump dependencies**

In `package.json`:
- Remove `"@sanity/demo": "1.0.2"` from `dependencies`.
- Change `"tailwindcss": "3.3.2"` to `"tailwindcss": "4.3.3"` in `devDependencies`.
- Add `"@tailwindcss/postcss": "4.3.3"` to `devDependencies` (alphabetical position: after `@types/styled-components`, before `autoprefixer`).

```bash
npm install
```

Expected: `@sanity/demo` removed from `node_modules`, `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3` installed, `package-lock.json` updated. No `ERESOLVE` errors.

- [ ] **Step 3: Point PostCSS at the v4 plugin**

`postcss.config.js` currently reads:

```js
// If you want to use other PostCSS plugins, see the following:
// https://tailwindcss.com/docs/using-with-preprocessors
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Change the `tailwindcss: {}` key to `'@tailwindcss/postcss': {}`:

```js
// If you want to use other PostCSS plugins, see the following:
// https://tailwindcss.com/docs/using-with-preprocessors
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Rewrite the top of `styles/index.css`**

Replace only the three `@tailwind` directive lines at the top of the file. Everything from `:root {` onward (the hand-written custom CSS) is untouched — do not reformat, reorder, or otherwise touch it.

Current top of file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Replace with:

```css
@import 'tailwindcss';

@theme {
  --color-gray-50: #f6f6f8;
  --color-gray-100: #eeeef1;
  --color-gray-200: #e3e4e8;
  --color-gray-300: #bbbdc9;
  --color-gray-500: #727892;
  --color-gray-600: #515870;
  --color-gray-800: #252837;
  --color-gray-900: #1b1d27;
  --color-blue-600: #4043e7;
  --color-primary: #2d6a4f;
  --color-background: #f8f8f8;

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --font-antarctican: var(--font-antarctican-mono);
  --font-ariana: var(--font-ariana-pro);
}
```

The rest of the file (the `:root { --font-sans: var(--font-antarctican-mono); }` block and everything below it) stays exactly as it is today.

- [ ] **Step 5: Delete the legacy Tailwind config**

```bash
rm tailwind.config.js
```

Nothing else references this file — verified by grepping `eslint.config.mjs` and every `.ts`/`.tsx`/`.js`/`.mjs`/`.json` file in the repo for `tailwind.config` outside `node_modules`/`.next`; the only hit was the file itself.

- [ ] **Step 6: Rebuild and verify against the reference table**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next
npm run build
```

Expected: build succeeds, same 20 pages generate.

Then serve it and check real computed styles — this is the actual pass/fail gate, not a text diff of the CSS (see Global Constraints for why a raw diff will legitimately not be empty):

```bash
npm run start &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Using a browser tool (or any way of running JS against the live page), navigate to `http://localhost:3000/` and run:

```js
function checkColor(cls, prop) {
  const el = document.createElement('div')
  el.className = cls
  if (prop === 'borderColor') { el.style.borderStyle = 'solid'; el.style.borderWidth = '1px' }
  document.body.appendChild(el)
  const v = getComputedStyle(el)[prop]
  el.remove()
  return v
}
JSON.stringify({
  'bg-gray-50': checkColor('bg-gray-50', 'backgroundColor'),
  'bg-gray-200': checkColor('bg-gray-200', 'backgroundColor'),
  'bg-gray-600': checkColor('bg-gray-600', 'backgroundColor'),
  'bg-gray-900': checkColor('bg-gray-900', 'backgroundColor'),
  'border-gray-300': checkColor('border-gray-300', 'borderColor'),
  'text-blue-600': checkColor('text-blue-600', 'color'),
  'text-gray-500': checkColor('text-gray-500', 'color'),
  'text-gray-600': checkColor('text-gray-600', 'color'),
  'text-gray-800': checkColor('text-gray-800', 'color'),
  'text-gray-900': checkColor('text-gray-900', 'color'),
  'bg-background': checkColor('bg-background', 'backgroundColor'),
  'border-primary': checkColor('border-primary', 'borderColor'),
  'htmlFontFamily': getComputedStyle(document.documentElement).fontFamily,
}, null, 2)
```

Expected: every value matches the reference table above exactly (`rgb(114, 120, 146)` for `text-gray-500`, not `rgb(114, 129, 146)` — that specific mismatch is the exact arithmetic slip already caught once during this plan's own research; if you see it again, re-derive the hex from the rgb triple, don't copy anything by eye).

Then navigate to `http://localhost:3000/tutorial` (this page has a literal `<code>` element from the CMS content) and run:

```js
const codeEl = document.querySelector('code')
codeEl ? getComputedStyle(codeEl).fontFamily : 'NOT FOUND ON THIS PAGE'
```

Expected: `"IBM Plex Mono", "IBM Plex Mono Fallback"` — confirms the `mono` token still reaches Tailwind's `code,kbd,samp,pre` preflight rule correctly.

Also spot-check `.font-serif` (used by `CustomPortableText.tsx`'s blockquote handler, not guaranteed to appear in current content) by injecting a test element the same way as the colour checks above, expecting `"PT Serif", "PT Serif Fallback"`.

Stop the server when done:

```bash
kill %1 2>/dev/null || pkill -f "next start"
```

If any value doesn't match: do not paper over it with a different hex or an `!important`. Something about the `@theme` block or the surrounding cascade is wrong — go back to Step 4 and figure out why, using the same computed-style method to narrow it down (inject the class, read the property, compare).

- [ ] **Step 7: Confirm no regressions elsewhere**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors. (Optional, not blocking: run `npm run format -- --check` or similar and see whether `prettier-plugin-tailwindcss@0.3.0` errors now that `tailwind.config.js` is gone — per Global Constraints, this is a known, accepted, non-CI-gated gap if it does.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json postcss.config.js styles/index.css
git rm tailwind.config.js
git commit -m "feat: migrate to Tailwind 4, delete legacy config and @sanity/demo"
```

**Exit criteria for this task (and for Phase 1C as a whole):** `tsc --noEmit`, `eslint .`, and `npm run build` green; every colour and font utility in the reference table resolves identically before and after; `tailwind.config.js` and `@sanity/demo` gone from the repo and `package.json`; no other behavioural change anywhere on the site.

---

## Retrospective: the reference table's verification method had blind spots

The whole-branch review (dispatched after Task 1 was implemented and task-reviewed) found four real regressions that this plan's Step 1/6 reference table could not have caught, because that table was built by grepping markup for **token names** (`gray-*`, `blue-*`, `background`, `primary`, font names) — a method that is structurally blind to anything that doesn't appear as a literal class name in JSX:

1. **`extend.borderColor.DEFAULT: '#2D6A4F'`** in the deleted `tailwind.config.js` — a config key with no corresponding className anywhere, silently applied by Tailwind v3's preflight to every bare border utility (`border`, `border-y`, `divide-y`, etc.). Reverted to black post-migration.
2. **`bg-opacity-70`** (Profile.tsx) — a utility class removed outright between v3 and v4 (opacity is now a `/70` modifier on the color utility itself). Silently became a dead, no-op class, leaving the element it targeted fully opaque instead of translucent.
3. **The `black` palette key** (`#0d0e12` from `@sanity/color`, via `@sanity/demo`'s top-level `theme: { ...theme }` spread) — outside the `gray`/`blue` families this plan enumerated, because the plan only checked the two families it saw in explicit className usages, not the full set of keys the deleted config's spread was overriding.
4. **Preflight default changes between v3 and v4** unrelated to color at all — v3's `button, [role="button"] { cursor: pointer }` has no v4 equivalent.

All four were fixed in a follow-up commit (`1fb46ab`) and re-verified against the same real-build/real-browser method, plus independently re-derived by the whole-branch reviewer (hand-recomputed hex↔rgb conversions from `@sanity/color`'s actual source and cascade-layer analysis of the compiled CSS, not just re-running the fix's own checks).

**Lesson for the next phase that ports a Tailwind (or any framework) config wholesale:** a token-name grep over markup is necessary but not sufficient. Two additional checks catch what it misses:
- **Diff the deleted config's full key set against the new theme, key by key** — including `extend.*` keys that don't map to an obvious utility-class family (like `borderColor.DEFAULT`), and the *entire* replaced palette, not just the families already known to be used in markup.
- **Walk the framework's own major-version breaking-change list against the repo's actual utility inventory** — some regressions (removed utilities, changed preflight defaults) have no config-key trail at all and can only be found by checking the changelog against what's actually used.
