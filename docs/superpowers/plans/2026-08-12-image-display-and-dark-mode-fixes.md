# Image Display & Dark Mode Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop cover images being geometrically stretched, reduce dark-mode glare from source images with baked-in white backgrounds, and repair three latent defects in the shared image components found during the investigation.

**Architecture:** Three independent defects, fixed at their own root cause. (1) `ImageBox`/`ImageContainer` never set `object-fit`, so the browser default `fill` **stretches** the bitmap whenever the box aspect ratio differs from the crop; adding an explicit fit makes every call site geometrically safe regardless of box shape. (2) The white backgrounds are baked into the source assets (verified: no asset has an alpha channel), so no CSS can recolour them selectively — a dark-mode-only brightness filter on the image **wrapper** is applied as a stopgap, composing with (not overwriting) the People page's existing per-`<img>` grayscale because filters compose down the element tree. (3) Two call sites pass no `classesWrapper`, producing a literal `class="... undefined"` and a wrapper with no positioning context.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 (`@theme inline` semantic tokens), Sanity v6 + `@sanity/image-url`, Vitest (unit/contract), Playwright (e2e).

## Global Constraints

- **Model:** every subagent dispatched for this plan uses **Sonnet** (standing preference for this repo).
- **No new dependencies.** Everything here is CSS, JSX, and one Sanity schema field.
- **Semantic tokens only.** Never introduce a raw palette value in a component; `styles/index.css` is the only place colour literals live.
- **Do not re-add horizontal padding** in page components — `Layout` is the single owner of page gutters (`--spacing-gutter*`).
- **Sanity schema changes require `npm run typegen`** afterwards, and the regenerated types must be committed.
- **Backwards compatibility:** every existing published document has the new timeline field **unset**. Unset must mean "visible" — never hide existing content.
- Formatting is Prettier with `semi: false`, `singleQuote: true`. Run `npm run format` before committing if unsure.

## Verified Baseline (measured 2026-08-12, do not re-derive)

Measured on the live dev server against the production dataset, viewport 1280x900, DPR 2:

| Surface | Box AR | Crop AR | Stretch |
|---|---|---|---|
| Home cards at `md:`+ | 1.318 / 1.753 / 1.635 / 1.165 | 1.750 | **0.666x – 1.002x** (varies per card) |
| Home cards at 375px | 1.778 | 1.752 | 1.015x |
| Project page cover | 1.778 | 1.751 | 1.015x |
| People cards | 1.000 | 1.000 | 1.000x (already correct) |

Source-asset white-edge survey (23 assets, sampled from raw bitmaps):
- **4 of 5 project covers: 100% white edges** — Publication highlights, Glial activity, About Dr Damian Holsinger, Involvement of gut microbiota.
- **5 of 18 profile photos: 57–84%** — Alan Yan (84), Dr Johnny Chan (79), Haochen Wu (65), Sreevadana Venkitachalam (62), Isaac Clark (57).
- **0 of 23 assets have any transparency.** Nothing is being flattened; the white is in the source files.

Dark-mode DOM scan on `/`, `/people`, `/publications`, `/projects/[slug]`: **zero** elements paint a light background. The Phase 3A token system is working correctly — this is not a token regression.

---

### Task 1: Give the shared image components an explicit `object-fit` and a real wrapper

This is the root-cause fix. `object-fit` defaults to `fill`, which stretches; every other symptom in this plan is downstream of it.

**Files:**
- Modify: `components/shared/ImageBox.tsx`
- Modify: `components/shared/ImageContainer.tsx`
- Test: `components/shared/image-fit-contract.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ImageBox` and `ImageContainer` keep their exact existing prop signatures (`image`, `alt`, `width`, `height`, `size`, `classesWrapper`). No caller signature changes. Both gain the stable CSS class **`media-frame`** on their outer wrapper `<div>`; Task 3 targets that class name — it must match exactly.

- [ ] **Step 1: Write the failing contract test**

Create `components/shared/image-fit-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const COMPONENTS = [
  'components/shared/ImageBox.tsx',
  'components/shared/ImageContainer.tsx',
]

describe('shared image components', () => {
  it.each(COMPONENTS)('%s sets an explicit object-fit', (path) => {
    const source = readFileSync(path, 'utf8')
    // Without this the browser default is `fill`, which stretches the
    // bitmap whenever the box aspect ratio differs from the Sanity crop.
    expect(source).toMatch(/object-(cover|contain)/)
  })

  it.each(COMPONENTS)(
    '%s never interpolates an undefined classesWrapper into className',
    (path) => {
      const source = readFileSync(path, 'utf8')
      // `${classesWrapper}` with the prop unset renders the literal
      // string "undefined" as a CSS class.
      expect(source).not.toMatch(/\$\{classesWrapper\}/)
    }
  )

  it.each(COMPONENTS)('%s carries the media-frame hook class', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).toContain('media-frame')
  })

  it('ImageBox positions its own wrapper rather than relying on callers', () => {
    const source = readFileSync('components/shared/ImageBox.tsx', 'utf8')
    // The <img> is absolutely positioned; without `relative` here it
    // resolves against whatever ancestor happens to be positioned.
    expect(source).toMatch(/relative/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/shared/image-fit-contract.test.ts`
Expected: FAIL — several assertions fail (no `object-cover`, `${classesWrapper}` present, no `media-frame`).

- [ ] **Step 3: Fix `ImageBox.tsx`**

Replace the returned JSX (keep every comment already in the file above the `size` prop):

```tsx
  return (
    <div
      className={`media-frame relative w-full overflow-hidden bg-surface-raised ${
        classesWrapper ?? ''
      }`}
    >
      {imageUrl && (
        <Image
          // `object-cover`, not the browser default `fill`: this component
          // fills fixed-aspect cover slots whose box is not guaranteed to
          // match the server-side crop. `fill` stretches the bitmap; at
          // `md:`+ the home cards' box was measured as far off as AR 1.165
          // against a 1.750 crop -- a 1.5x vertical stretch. `cover` crops
          // the overflow instead of distorting it.
          className="absolute h-full w-full object-cover"
          alt={alt}
          width={width}
          height={height}
          sizes={size}
          src={imageUrl}
        />
      )}
    </div>
  )
```

- [ ] **Step 4: Fix `ImageContainer.tsx`**

Replace its returned JSX (keep the existing `fit('max')` comment block):

```tsx
  return (
    <div
      className={`media-frame relative w-full overflow-hidden bg-surface-raised ${
        classesWrapper ?? ''
      }`}
    >
      {imageUrl && (
        <Image
          // `object-contain`, not `object-cover`: this component renders
          // arbitrary body-content images and already requests `fit('max')`
          // server-side to preserve the source aspect ratio. Contain never
          // crops, matching that intent; `cover` could silently clip a
          // figure. The browser default `fill` would stretch it.
          className="h-full w-full object-contain"
          alt={alt}
          width={width}
          height={height}
          sizes={size}
          src={imageUrl}
        />
      )}
    </div>
  )
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/shared/image-fit-contract.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 6: Run the full unit suite and type-check for regressions**

Run: `npm run test && npm run type-check`
Expected: all pass. `image-hotspot-contract.test.ts` must still pass.

- [ ] **Step 7: Commit**

```bash
git add components/shared/ImageBox.tsx components/shared/ImageContainer.tsx components/shared/image-fit-contract.test.ts
git commit -m "fix: set explicit object-fit on shared image components"
```

---

### Task 2: Remove the duplicated `h-full` on the home project cards

`aspect-[16/9]` is inert at `md:`+ because the flex row gives the column a definite height — that is *intended* (the image fills the card), and Task 1 has already made it geometrically safe. This task only removes the accidental duplication and documents why both classes coexist.

**Files:**
- Modify: `components/pages/home/ProjectListItem.tsx:35`
- Test: `components/pages/home/project-card-contract.test.ts` (create)

**Interfaces:**
- Consumes: `ImageBox` from Task 1 (now `object-cover`, wrapper is `relative` on its own).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `components/pages/home/project-card-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('ProjectListItem image wrapper', () => {
  const source = readFileSync('components/pages/home/ProjectListItem.tsx', 'utf8')

  it('does not repeat h-full', () => {
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    const occurrences = wrapper.split(/\s+/).filter((c) => c === 'h-full')
    expect(occurrences).toHaveLength(1)
  })

  it('keeps aspect-[16/9], which is load-bearing below the md breakpoint', () => {
    // Below `md:` the card is flex-col and the column has no definite
    // height, so this class is the only thing giving the box its shape.
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    expect(wrapper).toContain('aspect-[16/9]')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/pages/home/project-card-contract.test.ts`
Expected: FAIL — `expected length 2 to be 1` (the class list is `relative aspect-[16/9] h-full h-full `).

- [ ] **Step 3: Fix the class list**

In `components/pages/home/ProjectListItem.tsx`, replace line 35's `classesWrapper` with:

```tsx
          // Both `aspect-[16/9]` and `h-full` are load-bearing, at
          // different breakpoints. Below `md:` the card is `flex-col`, the
          // column has no definite height, and `aspect-[16/9]` gives the
          // box its shape. At `md:`+ the card is `flex-row`, the row
          // stretches this column to the *text* column's height, `h-full`
          // makes that height definite, and a box with definite width and
          // height ignores `aspect-ratio` entirely -- so the card stays
          // visually filled. That is intended; `ImageBox`'s `object-cover`
          // is what keeps the bitmap undistorted in the `md:`+ case.
          classesWrapper="aspect-[16/9] h-full"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/pages/home/project-card-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify in the browser at both breakpoints**

Start the dev server (`.claude/launch.json` config `holsinger-dev`, port 3000) and on `/` run this in the page console at 1280x900 and again at 375x812. Every `distort` value must be within `1.000 ± 0.02`:

```js
[...document.querySelectorAll('img')].map(i => {
  const r = i.getBoundingClientRect()
  return {
    alt: i.alt.slice(0, 24),
    box: Math.round(r.width) + 'x' + Math.round(r.height),
    fit: getComputedStyle(i).objectFit,
    distort: ((r.width / r.height) / (i.naturalWidth / i.naturalHeight)).toFixed(3),
  }
})
```

Expected: `fit` is `cover` on every row. At 1280 the four boxes have differing heights (they fill their cards) — that is correct. Record the output in the task report.

- [ ] **Step 6: Commit**

```bash
git add components/pages/home/ProjectListItem.tsx components/pages/home/project-card-contract.test.ts
git commit -m "fix: drop duplicated h-full on home project card image wrapper"
```

---

### Task 3: Dark-mode dim for images with baked-in white backgrounds

**Why a filter on the wrapper, not the `<img>`:** `components/pages/people/Profile.tsx:75` already applies `[&_img]:grayscale` plus a `hover:[&_img]:grayscale-0` transition directly to the `<img>`. CSS `filter` is a single property — a second rule targeting the same `<img>` would *replace* the grayscale, not add to it (this was confirmed live: prototyping the filter on `<img>` made the People photos render in colour). Filters applied to a parent element compose with a child's own filter, so the wrapper is the correct target.

**Files:**
- Modify: `styles/index.css`
- Test: `styles/media-dim.test.ts` (create)

**Interfaces:**
- Consumes: the `media-frame` class emitted by both components in Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `styles/media-dim.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync('styles/index.css', 'utf8')

describe('dark-mode media dimming', () => {
  it('defines a .media-frame filter only inside a dark-scheme media query', () => {
    expect(css, '.media-frame rule must exist').toContain('.media-frame')

    // Asserts containment, not merely "appears later in the file": the
    // rule must open inside a dark-scheme block, with no intervening
    // at-rule between the block's `{` and the selector.
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{[^@]*\.media-frame\s*\{[^}]*brightness\(/
    )

    // And it must not also be defined at the top level, which would apply
    // the dim in light mode too.
    const topLevel = css.replace(
      /@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g,
      ''
    )
    expect(topLevel, '.media-frame must not be defined outside dark mode').not.toContain(
      '.media-frame'
    )
  })

  it('dims rather than inverts or blends', () => {
    // invert()/mix-blend-mode were both tested against the live site and
    // destroy photographic content: multiply over #0d0e12 crushes the
    // image to a silhouette, invert() renders a photo negative.
    expect(css).toMatch(/\.media-frame[^}]*filter:[^;]*brightness\(/)
    expect(css).not.toMatch(/\.media-frame[^}]*mix-blend-mode/)
    expect(css).not.toMatch(/\.media-frame[^}]*invert\(/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run styles/media-dim.test.ts`
Expected: FAIL — `.media-frame rule must exist` (index is `-1`).

- [ ] **Step 3: Add the rule to `styles/index.css`**

Append this **after** the existing `@media (prefers-color-scheme: dark)` token block (do not put it inside that block — that block only redefines custom properties):

```css
/* Stopgap for source images with baked-in white backgrounds.

   Measured across the live dataset: 4 of 5 project covers have 100% white
   edge pixels and 5 of 18 profile photos are 57-84% white, while *zero*
   assets carry an alpha channel. Nothing in the pipeline is flattening
   transparency -- the white is in the source files, so no CSS can recolour
   it selectively (CSS cannot select "background" pixels). `invert()` and
   `mix-blend-mode: multiply` were both prototyped against the live site
   and destroy photographic content: multiply over --sem-surface crushes a
   portrait to a black silhouette, invert renders a photo negative.

   Dimming the wrapper is the honest compromise: it cuts the glare without
   touching hue. It is applied to the frame rather than the <img> because
   Profile.tsx sets `grayscale` on the <img> itself, and `filter` is a
   single property -- a second <img> rule would replace that grayscale.
   Filters compose down the element tree, so the wrapper stacks with it.

   REMOVE THIS RULE once the 9 affected assets are re-exported with
   transparent backgrounds; the wrapper's own `bg-surface-raised` will then
   show through and match the page in both themes with no filter at all.
   The asset list is in the PR description. */
@media (prefers-color-scheme: dark) {
  .media-frame {
    filter: brightness(0.78) contrast(1.04);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run styles/media-dim.test.ts`
Expected: PASS (2 assertions).

- [ ] **Step 5: Verify the grayscale composition did not break**

With the dev server running, load `/people` with dark colour scheme emulated and run:

```js
const img = document.querySelector('.media-frame img')
JSON.stringify({
  imgFilter: getComputedStyle(img).filter,
  wrapperFilter: getComputedStyle(img.parentElement).filter,
})
```

Expected: `imgFilter` still contains `grayscale(1)` (proving Task 3 did not overwrite it) **and** `wrapperFilter` contains `brightness(0.78)`. Both must be present. Record the output.

- [ ] **Step 6: Confirm light mode is untouched**

Re-run the same snippet with the light colour scheme. Expected: `wrapperFilter` is `none`.

- [ ] **Step 7: Commit**

```bash
git add styles/index.css styles/media-dim.test.ts
git commit -m "fix: dim images in dark mode to cut glare from white-backed assets"
```

---

### Task 4: Repair the timeline thumbnails

**Files:**
- Modify: `components/shared/TimelineItem.tsx:21-32`
- Test: `components/shared/timeline-thumbnail-contract.test.ts` (create)

**Interfaces:**
- Consumes: `ImageBox` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `components/shared/timeline-thumbnail-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync('components/shared/TimelineItem.tsx', 'utf8')

describe('TimelineItem thumbnail', () => {
  it('requests a source large enough for high-DPR screens', () => {
    // The thumbnail renders in a 65px CSS box. Passing width={65} caps the
    // Sanity render at 65px, and next/image cannot upscale past its
    // source, so a DPR-2 screen received a half-resolution bitmap.
    const width = Number(source.match(/width=\{(\d+)\}/)?.[1])
    expect(width).toBeGreaterThanOrEqual(130)
  })

  it('declares the real layout width rather than a viewport fraction', () => {
    // The box is a fixed 65px, so `10vw` over-declares on wide viewports
    // and under-declares on narrow ones.
    expect(source).toMatch(/size="65px"/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/shared/timeline-thumbnail-contract.test.ts`
Expected: FAIL — `expected 65 to be greater than or equal to 130`.

- [ ] **Step 3: Fix the call site**

In `components/shared/TimelineItem.tsx`, replace the `<ImageBox …/>` call (lines 25-31) with:

```tsx
          <ImageBox
            image={image}
            alt={title || 'Timeline item icon'}
            // The box is a fixed 65px square, so declare it in pixels --
            // `10vw` over-declares on a wide viewport and under-declares on
            // a narrow one. `width`/`height` cap what Sanity renders and
            // next/image never upscales past its source, so they are set to
            // 4x the CSS box to cover high-DPR screens; at this size the
            // byte cost is negligible.
            size="65px"
            width={260}
            height={260}
          />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/shared/timeline-thumbnail-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the rendered thumbnail**

Load `/projects/about-dr-damian-holsinger` and run:

```js
[...document.querySelectorAll('.media-frame')].map(w => {
  const i = w.querySelector('img'); const r = w.getBoundingClientRect()
  return { alt: i?.alt, wrapper: Math.round(r.width) + 'x' + Math.round(r.height),
           natural: i ? i.naturalWidth + 'x' + i.naturalHeight : null,
           cls: w.className }
})
```

Expected: no `className` contains the string `undefined`; the timeline wrappers report a **non-zero** height (they were `65x0`); `natural` is at least `130x130`. Record the output.

- [ ] **Step 6: Commit**

```bash
git add components/shared/TimelineItem.tsx components/shared/timeline-thumbnail-contract.test.ts
git commit -m "fix: raise timeline thumbnail resolution and declare its real size"
```

---

### Task 5: Add an explicit per-timeline visibility toggle

The timeline is a portable-text block inside `project.description`, so it is *already* removable by deleting the block. This adds a non-destructive switch so an editor can hide one without losing its content.

**Files:**
- Modify: `schemas/objects/timeline.ts`
- Modify: `components/shared/CustomPortableText.tsx:159-162`
- Test: `components/shared/timeline-visibility.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a `hidden?: boolean` field on the `timeline` object type. **Unset and `false` both mean visible**; only an explicit `true` hides it.

- [ ] **Step 1: Write the failing test**

Create `components/shared/timeline-visibility.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('timeline visibility toggle', () => {
  it('declares a hidden field on the timeline schema', () => {
    const schema = readFileSync('schemas/objects/timeline.ts', 'utf8')
    expect(schema).toMatch(/name: 'hidden'/)
    expect(schema).toMatch(/type: 'boolean'/)
  })

  it('treats only an explicit true as hidden', () => {
    const source = readFileSync('components/shared/CustomPortableText.tsx', 'utf8')
    // Every already-published document has this field unset. A truthiness
    // check on the wrong side of the comparison would hide all existing
    // timelines, so the guard must test for `=== true` / `if (hidden)`
    // and return null, never `if (!hidden)`.
    expect(source).toMatch(/hidden/)
    expect(source).not.toMatch(/if \(!hidden\)/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/shared/timeline-visibility.test.ts`
Expected: FAIL — no `name: 'hidden'` in the schema.

- [ ] **Step 3: Add the schema field**

In `schemas/objects/timeline.ts`, add this as the **first** entry of the top-level `fields` array, before `items`:

```ts
    defineField({
      name: 'hidden',
      title: 'Hide this timeline',
      type: 'boolean',
      initialValue: false,
      description:
        'Hides the timeline on the published page without deleting its content. Leave off to show it.',
    }),
```

- [ ] **Step 4: Guard the renderer**

In `components/shared/CustomPortableText.tsx`, replace the `timeline` component (lines 159-162) with:

```tsx
      timeline: ({ value }) => {
        const { items, hidden } = value || {}
        // Unset means visible: every document published before this field
        // existed has `hidden === undefined`, and those must keep
        // rendering. Only an explicit `true` hides the block.
        if (hidden === true) return null
        return <TimelineSection timelines={items} />
      },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/shared/timeline-visibility.test.ts`
Expected: PASS.

- [ ] **Step 6: Regenerate Sanity types**

Run: `npm run typegen`
Expected: succeeds offline (it reads the local schema and queries; it does **not** need Studio auth). Then run `npm run type-check` — expected clean. If `typegen` fails for an environment reason, record the exact error in the task report and do **not** hand-edit the generated file.

- [ ] **Step 7: Verify existing content still renders**

Load `/projects/about-dr-damian-holsinger` and confirm the timeline is still present (its `hidden` field is unset in production). Run:

```js
document.body.innerText.includes('Project Launch')
```

Expected: `true`. This is the backwards-compatibility check — if it is `false`, the guard is inverted.

- [ ] **Step 8: Commit**

```bash
git add schemas/objects/timeline.ts components/shared/CustomPortableText.tsx components/shared/timeline-visibility.test.ts
git add sanity.types.ts schema.json 2>/dev/null || true
git commit -m "feat: add a per-timeline hide toggle that defaults to visible"
```

---

### Task 6: End-to-end regression guards

Source-inspection tests cannot catch a *layout* regression — only measuring the rendered box can. This is the test that would have caught the original bug.

**Files:**
- Create: `e2e/image-geometry.spec.ts`

**Interfaces:**
- Consumes: the rendered output of Tasks 1-4.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Create `e2e/image-geometry.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

/** Routes that render at least one cover image. */
const ROUTES = ['/', '/people', '/projects/about-dr-damian-holsinger']

/** Widths that exercise both the flex-col and flex-row card layouts. */
const WIDTHS = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 900 },
]

for (const { label, width, height } of WIDTHS) {
  for (const route of ROUTES) {
    test(`${route} renders undistorted images at ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto(route)
      // next/image lazy-loads; scroll to the bottom so every image decodes.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForLoadState('networkidle')

      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((i) => i.naturalWidth > 0)
          .map((i) => {
            const r = i.getBoundingClientRect()
            return {
              alt: i.alt,
              boxAR: r.width / r.height,
              natAR: i.naturalWidth / i.naturalHeight,
              objectFit: getComputedStyle(i).objectFit,
            }
          })
      )

      expect(rows.length).toBeGreaterThan(0)

      for (const row of rows) {
        // `fill` is the browser default and the original defect: it
        // stretches the bitmap to the box instead of cropping.
        expect(row.objectFit, `${row.alt} must not use object-fit: fill`).not.toBe('fill')
      }
    })
  }
}

test('no element renders a literal "undefined" CSS class', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route)
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((el) => typeof el.className === 'string' && /\bundefined\b/.test(el.className))
        .map((el) => el.tagName + '.' + el.className)
    )
    expect(offenders, `${route} has elements with an undefined class`).toEqual([])
  }
})

test('image frames are dimmed in dark mode only', async ({ browser }) => {
  const dark = await browser.newPage({ colorScheme: 'dark' })
  await dark.goto('/people')
  const darkFilter = await dark
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(darkFilter).toContain('brightness')
  await dark.close()

  const light = await browser.newPage({ colorScheme: 'light' })
  await light.goto('/people')
  const lightFilter = await light
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(lightFilter).toBe('none')
  await light.close()
})

test('the People grayscale treatment survives the dark-mode dim', async ({ browser }) => {
  // Regression guard: applying the dim to the <img> instead of the wrapper
  // silently replaced this grayscale, because `filter` is one property.
  const page = await browser.newPage({ colorScheme: 'dark' })
  await page.goto('/people')
  const imgFilter = await page
    .locator('.media-frame img')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(imgFilter).toContain('grayscale')
  await page.close()
})
```

- [ ] **Step 2: Run the suite**

Run: `npm run test:e2e -- e2e/image-geometry.spec.ts`
Expected: PASS on all cases. If any fails, the fix in the corresponding earlier task is incomplete — go back and fix that task rather than relaxing the assertion.

- [ ] **Step 3: Run the whole e2e suite for regressions**

Run: `npm run test:e2e`
Expected: no new failures versus `main`. If a pre-existing failure appears, record it in the task report and confirm it also fails on `main` before attributing it elsewhere.

- [ ] **Step 4: Commit**

```bash
git add e2e/image-geometry.spec.ts
git commit -m "test: add e2e guards for image geometry and dark-mode dimming"
```

---

### Task 7: Final verification sweep

**Files:** none modified — this task produces evidence only.

- [ ] **Step 1: Full gate**

Run each and record the actual output:

```bash
npm run test && npm run type-check && npm run lint && npm run test:e2e
```

- [ ] **Step 2: Visual confirmation across the matrix**

With the dev server running, capture a screenshot of `/`, `/people`, `/publications`, and `/projects/about-dr-damian-holsinger` in **light and dark**, at **375px and 1280px** (16 screenshots). Confirm for each: no stretched faces or figures, no white slab glare in dark mode, no layout shift versus `main` in light mode.

- [ ] **Step 3: Record the residual**

State plainly in the report that the dim is a **stopgap** and that the images still have white backgrounds — list the 9 assets so the PR can carry them.

---

## Out of Scope

Deliberately excluded, not oversights:

- **Re-exporting the 9 white-background assets.** Content work, and only the lab can do it. The PR carries the list.
- **Deleting the Dr Holsinger timeline.** It is leftover Sanity starter demo content ("askdwhfw er wehfsd jefhwdkjs", "Fieldwork carried out by XXX", stock photography) and is the only timeline block in the dataset, but removing it is a content decision for the lab. Task 5 gives them the switch.
- **The ~6px sticky-header overlap** deferred from Phase 3C, and the `md:top-[70px]` / shared nav-height token fast-follow. Unrelated to image rendering.
- **`roleGroup` / `doi` backfills.** Still outstanding from Phase 3B; unrelated.
