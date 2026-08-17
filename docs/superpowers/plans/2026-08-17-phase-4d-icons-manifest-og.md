# Phase 4D — Icons, Manifest, OG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site's favicon, web manifest, viewport theme colour, robots.txt and JSON-LD logo all CMS-driven or environment-correct, closing out defects D1/D2/D3/D4/D6/D7 and deleting the last dead artifacts from the pre-modernisation site.

**Architecture:** Two small pure modules join the existing `lib/branding.ts` / `lib/theme.ts` / `lib/layout-branding.ts` family — `lib/icons.ts` (CMS icon URL resolution, shared by the favicon block and the manifest) and `lib/manifest.ts` (the manifest object builder). `app/manifest.ts` and `app/robots.ts` are new Next file-convention routes, each doing its own independent settings fetch exactly like the existing `app/sitemap.ts`. `app/layout.tsx`'s `generateMetadata`/`generateViewport` stay thin wiring, matching how `resolveBranding`/`resolveBrandStyle` are already used there.

**Tech Stack:** Next.js 16 App Router (server components, file-convention metadata routes), Sanity 6.9.1, `@sanity/image-url`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-17-phase-4d-icons-manifest-og-design.md`

## Global Constraints

- **Imports are absolute from the repo root** (`lib/icons`, not `../lib/icons`) — `vite-tsconfig-paths` and `tsconfig.json` are already set up for this.
- **Prettier config: no semicolons, single quotes.** Run `npm run format` before committing if unsure.
- **Any settings fetch whose result reaches machine-readable output — JSON-LD, the web manifest, viewport meta tags — must pass `stega: false`.** Phase 2D's own recorded lesson, restated in `docs/branding.md`: a fetch tuned for visible UI leaks invisible stega characters into non-visual output during draft-mode sessions.
- **`app/manifest.ts` and `app/robots.ts` each do their own independent settings fetch**, not the `cache()`-shared instance `app/layout.tsx` uses — they are separate routes, exactly like the existing `app/sitemap.ts`'s independent `getAllPaths()` fetch.
- **Nothing in the root layout may throw.** It wraps `/studio`, so an exception takes down both the site and the CMS needed to fix it. Reuse `fetchSettingsSafely`'s existing try/catch; never bypass it.
- **No new runtime dependency.** Everything needed (`@sanity/image-url`'s `.format()`, Next's `MetadataRoute` types) already exists in this repo.
- **New pure logic goes in `lib/*.ts`, tested with plain literals; `app/*.ts` files stay thin wiring.** Established by `lib/branding.ts`, `lib/logo.ts`, `lib/theme.ts` and `lib/layout-branding.ts` — this repo has no React render-testing stack, so anything left inline in a route/layout is effectively untested.
- Run the unit suite with `npm test`, e2e with `npm run test:e2e`, types with `npm run type-check`, lint with `npm run lint`, a real build with `npm run build`.

---

## Task 1: `settings.icon` schema field, query, typegen, fallback

**Files:**
- Modify: `schemas/singletons/settings.ts` (insert after the `logoDark` field, before `brandColor`)
- Modify: `lib/sanity.queries.ts` (`settingsQuery`, insert after the `logoDark{...}` block, before `labHead->{`)
- Modify: `types/index.ts` (`fallbackSettings`, insert after `logoDark: null,`)
- Regenerate: `sanity.types.ts` via `npm run typegen`

**Interfaces:**
- Consumes: nothing.
- Produces: `settings.icon` as `Image | null` on `SettingsPayload`, same shape as the existing `ogImage` field — a bare (non-dereferenced) Sanity image reference. Read by Task 2's `resolveIconUrl`.

- [ ] **Step 1: Add the schema field**

In `schemas/singletons/settings.ts`, immediately after the `logoDark` field definition (before `brandColor`), add:

```ts
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'image',
      group: 'branding',
      // No `hotspot`: rendered as a small square (browser tab, phone home
      // screen) at several fixed sizes, the same reasoning as `logo` having
      // none.
      description:
        'A square image for browser tabs and when the site is saved to a phone home screen. Leave empty to use the site’s built-in icon.',
    }),
```

- [ ] **Step 2: Extend the query**

In `lib/sanity.queries.ts`, inside `settingsQuery`'s projection, add one line immediately after the closing `},` of the `logoDark{...}` block (before `labHead->{`):

```groq
    icon,
```

No `asset->{...}` dereference needed — unlike `logo`/`logoDark`, nothing reads the icon's aspect ratio; it is always requested at fixed square sizes, the same reasoning `ogImage` already uses.

- [ ] **Step 3: Add the fallback**

In `types/index.ts`, in the `fallbackSettings` object, add one line immediately after `logoDark: null,`:

```ts
  icon: null,
```

- [ ] **Step 4: Regenerate types and verify**

```bash
npm run typegen
npm run type-check
npm test
```

Expected: typegen rewrites `sanity.types.ts` to include `icon` on `SettingsQueryResult`; type-check and the unit suite both pass. `npm run typegen` requires Sanity credentials — if it fails on auth, note it and continue; nothing in this task's own code depends on the regenerated types (the schema and query changes are what Studio and the live query actually use).

- [ ] **Step 5: Commit**

```bash
git add schemas/singletons/settings.ts lib/sanity.queries.ts types/index.ts
git add -A -- '*.ts' # picks up regenerated typegen output if it changed
git commit -m "feat: add settings.icon field for a CMS-driven favicon"
```

---

## Task 2: `lib/icons.ts` — CMS icon URL resolution

**Files:**
- Create: `lib/icons.ts`
- Test: `lib/icons.test.ts`

**Interfaces:**
- Consumes: `urlForImage` from `lib/sanity.image`; `settings.icon` (Task 1).
- Produces: `resolveIconUrl(icon: Image | null | undefined, size: number): string | null` — shared by Task 3 (favicon) and Task 4 (manifest icons), so the two can never resolve the same field two different ways.

- [ ] **Step 1: Write the failing test**

Create `lib/icons.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

// Same reasoning and shape as lib/json-ld.test.ts's mock: lib/sanity.image
// transitively imports lib/sanity.api, whose module-scope assertValue()
// throws if Sanity env vars are unset. A self-referential chain object
// supports any order/combination of builder calls before `.url()`, so one
// mock covers both this module's `.width().url()` and the rest of the
// codebase's `.width().height().fit().url()`.
vi.mock('lib/sanity.image', () => ({
  urlForImage: () => {
    const chain = {
      width: () => chain,
      height: () => chain,
      fit: () => chain,
      format: () => chain,
      url: () => 'https://cdn.sanity.io/mock-icon.png',
    }
    return chain
  },
}))

import { resolveIconUrl } from 'lib/icons'
import type { Image } from 'sanity'

describe('resolveIconUrl', () => {
  it('returns null when no icon is uploaded', () => {
    expect(resolveIconUrl(null, 32)).toBeNull()
    expect(resolveIconUrl(undefined, 32)).toBeNull()
  })

  it('resolves a Sanity CDN URL when an icon is uploaded', () => {
    const icon = { asset: { _ref: 'image-abc123-512x512-png' } } as Image
    expect(resolveIconUrl(icon, 32)).toBe('https://cdn.sanity.io/mock-icon.png')
  })

  it('resolves the same URL shape at every requested size', () => {
    const icon = { asset: { _ref: 'image-abc123-512x512-png' } } as Image
    for (const size of [16, 32, 180, 192, 512]) {
      expect(resolveIconUrl(icon, size)).toBe('https://cdn.sanity.io/mock-icon.png')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/icons.test.ts`
Expected: FAIL — `Failed to resolve import "lib/icons"`.

- [ ] **Step 3: Write the implementation**

Create `lib/icons.ts`:

```ts
/**
 * CMS icon URL resolution, shared by `generateMetadata`'s favicon block and
 * `app/manifest.ts` -- one function, so the two can never resolve
 * `settings.icon` two different ways.
 */

import { urlForImage } from 'lib/sanity.image'
import type { Image } from 'sanity'

/**
 * A single icon URL at `size`×`size`, cropped to a square, or null if no
 * icon is uploaded. PNG is forced regardless of the source file's format --
 * favicons and manifest icons are read by browser chrome, not rendered in
 * page content, so `auto('format')` (which `urlForImage` applies by
 * default) would risk serving a browser a format it does not expect there.
 */
export function resolveIconUrl(
  icon: Image | null | undefined,
  size: number
): string | null {
  if (!icon) return null
  return (
    urlForImage(icon)
      ?.width(size)
      .height(size)
      .fit('crop')
      .format('png')
      .url() ?? null
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/icons.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add lib/icons.ts lib/icons.test.ts
git commit -m "feat: resolve CMS icon URLs for favicons and the web manifest"
```

---

## Task 3: CMS favicon in `generateMetadata`, delete dead IE/Edge artifacts

**Files:**
- Modify: `app/layout.tsx:96-116` (`generateMetadata`)
- Delete: `public/favicon/browserconfig.xml`, `public/favicon/mstile-150x150.png`

**Interfaces:**
- Consumes: `resolveIconUrl` from `lib/icons` (Task 2); `settings.icon` (Task 1).
- Produces: nothing new later tasks depend on.

- [ ] **Step 1: Wire the favicon block to the CMS and drop the dead `other` entries**

In `app/layout.tsx`, add `resolveIconUrl` and the `Image` type to the imports:

```ts
import { resolveIconUrl } from 'lib/icons'
```

(add alongside the existing `lib/*` imports) and:

```ts
import type { Image } from 'sanity'
```

(add alongside `import type { Metadata, Viewport } from 'next'`).

Replace `generateMetadata` (currently lines 96-116):

```ts
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = resolveBranding(await getSettings())

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    icons: {
      icon: [
        { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      shortcut: '/favicon/favicon.ico',
      apple: { url: '/favicon/apple-touch-icon.png', sizes: '180x180' },
    },
    manifest: '/favicon/site.webmanifest',
    other: {
      'msapplication-TileColor': '#000000',
      'msapplication-config': '/favicon/browserconfig.xml',
    },
  }
}
```

with:

```ts
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const { siteName } = resolveBranding(settings)
  const icon = settings.icon as Image | null | undefined

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    icons: {
      icon: [
        {
          url: resolveIconUrl(icon, 32) ?? '/favicon/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png',
        },
        {
          url: resolveIconUrl(icon, 16) ?? '/favicon/favicon-16x16.png',
          sizes: '16x16',
          type: 'image/png',
        },
      ],
      // /favicon.ico is requested by browsers at a fixed path outside
      // Next's metadata system. Generating a real .ico requires ICO
      // container encoding, not worth the complexity here -- this stays
      // the static legacy fallback while the CMS-driven PNGs above (which
      // browsers prefer when both are present) do the real work.
      shortcut: '/favicon/favicon.ico',
      apple: {
        url: resolveIconUrl(icon, 180) ?? '/favicon/apple-touch-icon.png',
        sizes: '180x180',
      },
    },
    manifest: '/favicon/site.webmanifest',
  }
}
```

Note `manifest:` is left in place for now — Task 4 removes it once `app/manifest.ts` exists to replace it. The `other` block (`msapplication-*`) is deleted outright: it targets IE11 (EOL June 2022) and Edge Legacy (EOL March 2021), and repairing dead technology in a repo nobody will maintain is worse than removing it.

- [ ] **Step 2: Delete the dead artifacts**

```bash
git rm public/favicon/browserconfig.xml public/favicon/mstile-150x150.png
```

- [ ] **Step 3: Verify against a real build**

```bash
npm run type-check
npm test
npm run build
```

Expected: all pass. There is no automated favicon test — a Sanity Studio icon upload is manual-verification-only in this environment (§7 of the parent spec), and even a live check has limited signal because favicons are cached aggressively client-side. Against the live dataset (`settings.icon` unset today) the site falls back to the same static PNGs it serves now, so this is a no-visible-change deploy until someone uploads an icon.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire the favicon to settings.icon, delete dead IE/Edge artifacts

Fixes D4 by removing the browserconfig.xml path defect outright rather
than repairing it -- it targets IE11/Edge Legacy, both long past EOL."
```

---

## Task 4: `app/manifest.ts` — CMS-driven web app manifest

**Files:**
- Create: `lib/manifest.ts`
- Test: `lib/manifest.test.ts`
- Modify: `lib/theme.ts` (add `themeColorFor`)
- Modify: `lib/theme.test.ts` (test it)
- Create: `app/manifest.ts`
- Modify: `app/layout.tsx` (remove the now-redundant `manifest:` entry)
- Delete: `public/favicon/site.webmanifest`

**Interfaces:**
- Consumes: `resolveIconUrl` from `lib/icons` (Task 2); `resolveBranding` from `lib/branding`; `resolveThemeName`, `PRESET_SURFACES`, `ThemeName` from `lib/theme`.
- Produces: `themeColorFor(theme: ThemeName): { light: string; dark: string }` in `lib/theme.ts` — reused by Task 5's `generateViewport`, so the manifest's `theme_color` and the browser chrome colour can never disagree about what one preset means. `buildManifest(...): MetadataRoute.Manifest` in `lib/manifest.ts`.

- [ ] **Step 1: Write the failing test for `themeColorFor`**

In `lib/theme.test.ts`, add the import and a new describe block:

```ts
import { themeColorFor } from 'lib/theme'
```

(add to the existing `from 'lib/theme'` import list)

```ts
describe('themeColorFor', () => {
  it('returns the light and dark base surface for the default preset', () => {
    expect(themeColorFor('default')).toEqual({ light: '#f8f8f8', dark: '#0d0e12' })
  })

  it('returns the light and dark base surface for the warm preset', () => {
    expect(themeColorFor('warm')).toEqual({ light: '#faf8f4', dark: '#12100d' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/theme.test.ts`
Expected: FAIL — `themeColorFor is not defined`.

- [ ] **Step 3: Implement `themeColorFor`**

In `lib/theme.ts`, add after `resolveThemeName`:

```ts
/**
 * The `theme-color` a browser or manifest should use for one preset, per
 * colour scheme -- always the base surface, matching what an unstyled page
 * paints before any content renders. Shared by `generateViewport` and
 * `app/manifest.ts` so the two never disagree about what one preset means.
 */
export function themeColorFor(theme: ThemeName): { light: string; dark: string } {
  return {
    light: PRESET_SURFACES[theme].light[0],
    dark: PRESET_SURFACES[theme].dark[0],
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `buildManifest`**

Create `lib/manifest.test.ts`:

```ts
import { buildManifest } from 'lib/manifest'
import { describe, expect, it } from 'vitest'

describe('buildManifest', () => {
  it('uses the resolved site name and short name', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.name).toBe('Holsinger Lab')
    expect(manifest.short_name).toBe('Holsinger')
  })

  it('falls back to the static PNGs when no CMS icon is uploaded', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.icons).toEqual([
      {
        src: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ])
  })

  it('uses the CMS icon URLs when supplied', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: 'https://cdn.sanity.io/icon-192.png',
      icon512: 'https://cdn.sanity.io/icon-512.png',
    })
    expect(manifest.icons).toEqual([
      { src: 'https://cdn.sanity.io/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'https://cdn.sanity.io/icon-512.png', sizes: '512x512', type: 'image/png' },
    ])
  })

  it('sources theme_color and background_color from the preset light surface', () => {
    const defaultManifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(defaultManifest.theme_color).toBe('#f8f8f8')
    expect(defaultManifest.background_color).toBe('#f8f8f8')

    const warmManifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'warm',
      icon192: null,
      icon512: null,
    })
    expect(warmManifest.theme_color).toBe('#faf8f4')
  })

  it('always requests standalone display', () => {
    const manifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.display).toBe('standalone')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- lib/manifest.test.ts`
Expected: FAIL — `Failed to resolve import "lib/manifest"`.

- [ ] **Step 7: Write the implementation**

Create `lib/manifest.ts`:

```ts
/**
 * Pure builder for the web app manifest. No Sanity, no `next/*` fetch --
 * `app/manifest.ts` resolves settings and CMS icon URLs, then hands the
 * results here so the shape stays testable with plain literals, the same
 * reasoning as `lib/layout-branding.ts`.
 */

import { themeColorFor } from 'lib/theme'
import type { ThemeName } from 'lib/theme'
import type { MetadataRoute } from 'next'

export function buildManifest({
  siteName,
  shortName,
  theme,
  icon192,
  icon512,
}: {
  siteName: string
  shortName: string
  theme: ThemeName
  icon192: string | null
  icon512: string | null
}): MetadataRoute.Manifest {
  // The manifest's chrome colour and the viewport's theme-color meta tag
  // (generateViewport, Task 5) both read this -- one source, so they cannot
  // drift apart the way the pre-4D static manifest and static viewport did.
  const themeColor = themeColorFor(theme).light

  return {
    name: siteName,
    short_name: shortName,
    icons: [
      {
        src: icon192 ?? '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: icon512 ?? '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- lib/manifest.test.ts`
Expected: PASS.

- [ ] **Step 9: Create `app/manifest.ts`**

```ts
import { resolveBranding } from 'lib/branding'
import { resolveIconUrl } from 'lib/icons'
import { buildManifest } from 'lib/manifest'
import { sanityFetch } from 'lib/sanity.live'
import { settingsQuery } from 'lib/sanity.queries'
import { fetchSettingsSafely } from 'lib/settings'
import { resolveThemeName } from 'lib/theme'
import type { MetadataRoute } from 'next'
import type { Image } from 'sanity'

export const revalidate = 60

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await fetchSettingsSafely(() =>
    sanityFetch({ query: settingsQuery, stega: false })
  )
  const { siteName, shortName } = resolveBranding(settings)
  const icon = settings.icon as Image | null | undefined

  return buildManifest({
    siteName,
    shortName,
    theme: resolveThemeName(settings.theme),
    icon192: resolveIconUrl(icon, 192),
    icon512: resolveIconUrl(icon, 512),
  })
}
```

This is a fully independent fetch, not the layout's `cache()`-shared instance — matching `app/sitemap.ts`'s existing `getAllPaths()` precedent for file-convention routes.

- [ ] **Step 10: Remove the now-redundant static manifest entry and delete the file**

In `app/layout.tsx`'s `generateMetadata`, delete the line:

```ts
    manifest: '/favicon/site.webmanifest',
```

Next auto-discovers and links `app/manifest.ts`; a static `manifest:` entry would now point at a file that no longer exists.

```bash
git rm public/favicon/site.webmanifest
```

- [ ] **Step 11: Verify against a real build**

```bash
npm run type-check
npm test
npm run build
```

Expected: all pass. Manual spot-check: `npm run build && npm run start &`, then `curl -s http://localhost:3000/manifest.webmanifest | head` should return JSON with `"name"` set to the resolved site name and `"display": "standalone"`. Kill the server afterward. Permanent e2e coverage lands in Task 8.

- [ ] **Step 12: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts lib/manifest.ts lib/manifest.test.ts app/manifest.ts app/layout.tsx
git commit -m "feat: generate the web app manifest from CMS settings

Replaces public/favicon/site.webmanifest, fixing D2 (hardcoded
'Next.js' name) and D3 (wrong /favicons/ plural icon paths)."
```

---

## Task 5: `generateViewport` — dynamic theme colour

**Files:**
- Modify: `lib/layout-branding.ts` (add `resolveViewportColors`)
- Modify: `lib/layout-branding.test.ts` (test it)
- Modify: `app/layout.tsx:118` (replace the static `viewport` export)

**Interfaces:**
- Consumes: `themeColorFor` from `lib/theme` (Task 4); `resolveThemeName` from `lib/theme` (already imported transitively via `resolveBrandStyle`'s module).
- Produces: `resolveViewportColors(settings: BrandStyleSource | null | undefined): { light: string; dark: string }`, called once from `app/layout.tsx`'s new `generateViewport`.

- [ ] **Step 1: Write the failing test**

In `lib/layout-branding.test.ts`, add:

```ts
import { resolveViewportColors } from 'lib/layout-branding'
```

(add to the existing `from 'lib/layout-branding'` import)

```ts
describe('resolveViewportColors', () => {
  it('returns the default preset colours when theme is unset', () => {
    expect(resolveViewportColors({})).toEqual({ light: '#f8f8f8', dark: '#0d0e12' })
  })

  it('returns the warm preset colours when theme is warm', () => {
    expect(resolveViewportColors({ theme: 'warm' })).toEqual({
      light: '#faf8f4',
      dark: '#12100d',
    })
  })

  it('falls back to default for an unknown theme value', () => {
    expect(resolveViewportColors({ theme: 'chartreuse' })).toEqual({
      light: '#f8f8f8',
      dark: '#0d0e12',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/layout-branding.test.ts`
Expected: FAIL — `resolveViewportColors is not defined`.

- [ ] **Step 3: Implement it**

In `lib/layout-branding.ts`, change the import line:

```ts
import { buildBrandStyle, resolveThemeName } from 'lib/theme'
```

to:

```ts
import { buildBrandStyle, resolveThemeName, themeColorFor } from 'lib/theme'
```

and add, after `resolveBrandStyle`:

```ts
/**
 * The `theme-color` values `generateViewport` serves, resolved the same way
 * `resolveBrandStyle` resolves `data-theme` -- reusing `resolveThemeName` so
 * an invalid or missing CMS value degrades to the default preset instead of
 * an unstyled browser chrome colour.
 */
export function resolveViewportColors(
  settings: BrandStyleSource | null | undefined
): { light: string; dark: string } {
  return themeColorFor(resolveThemeName(settings?.theme))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/layout-branding.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the layout**

In `app/layout.tsx`, add `resolveViewportColors` to the existing import:

```ts
import { resolveBrandStyle, resolveViewportColors } from 'lib/layout-branding'
```

Replace the static export:

```ts
export const viewport: Viewport = { themeColor: '#F8F8F8' }
```

with:

```ts
export async function generateViewport(): Promise<Viewport> {
  const { light, dark } = resolveViewportColors(await getSettings())
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: light },
      { media: '(prefers-color-scheme: dark)', color: dark },
    ],
  }
}
```

`getSettings()` is already `cache()`d, so this adds no extra fetch — `generateMetadata`, `generateViewport` and `RootLayout` all share the one request-scoped call.

- [ ] **Step 6: Verify against a real build**

```bash
npm run type-check
npm test
npm run build
```

Expected: all pass. Against the live dataset (`theme` unset today, defaulting to `default`), the rendered `<meta name="theme-color">` tags now carry `#f8f8f8` (light) and `#0d0e12` (dark) instead of the old flat `#F8F8F8` for both — this is the exact D6 fix, verified for real in Task 8's e2e coverage.

- [ ] **Step 7: Commit**

```bash
git add lib/layout-branding.ts lib/layout-branding.test.ts app/layout.tsx
git commit -m "fix: derive light/dark viewport theme-color from the active preset

Fixes D6 -- dark-mode visitors previously got light browser chrome
(#F8F8F8) above a #0d0e12 page."
```

---

## Task 6: `app/robots.ts`

**Files:**
- Create: `app/robots.ts`
- Delete: `public/robots.txt`

**Interfaces:**
- Consumes: `siteUrl` from `lib/site`.
- Produces: nothing later tasks depend on.

No pure-logic extraction here — there is no conditional logic to test in isolation, matching `app/sitemap.ts`'s own precedent of zero abstraction and zero unit test for a one-shot `siteUrl`-based build.

- [ ] **Step 1: Create the file**

```ts
import { siteUrl } from 'lib/site'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
```

- [ ] **Step 2: Delete the static file**

```bash
git rm public/robots.txt
```

- [ ] **Step 3: Verify against a real build**

```bash
npm run type-check
npm run build
```

Expected: both pass. Manual spot-check: `npm run build && npm run start &`, then `curl -s http://localhost:3000/robots.txt` should show `Allow: /` and a `Sitemap:` line built from the real `siteUrl` (`https://holsingerlab.vercel.app` unless `NEXT_PUBLIC_SITE_URL` is overridden), not the old hardcoded value. Kill the server afterward. Permanent e2e coverage lands in Task 8.

- [ ] **Step 4: Commit**

```bash
git add app/robots.ts
git commit -m "feat: generate robots.txt from siteUrl instead of a hardcoded deployment URL

Fixes D7."
```

---

## Task 7: JSON-LD logo — resolve from the CMS, delete `public/logo.svg`

**Files:**
- Modify: `lib/json-ld.ts` (add `resolveOrganizationLogoUrl`)
- Modify: `lib/json-ld.test.ts` (widen the shared mock, update stale `/logo.svg` examples, test the new resolver)
- Modify: `app/layout.tsx` (call site)
- Modify: `e2e/json-ld.spec.ts:34` (the assertion currently pinned to the old path)
- Delete: `public/logo.svg`

**Interfaces:**
- Consumes: `urlForImage` from `lib/sanity.image` (already imported in `lib/json-ld.ts`); `settings.logo` (existing, from 4B).
- Produces: `resolveOrganizationLogoUrl(logo: Image | null | undefined): string | undefined`, called once from `app/layout.tsx`.

This task fixes both the production code and every test that pins the old `/logo.svg` behaviour in the same commit — leaving either half done would leave the suite red between commits.

- [ ] **Step 1: Widen the shared mock and update the stale examples**

In `lib/json-ld.test.ts`, replace the top-of-file mock:

```ts
vi.mock('lib/sanity.image', () => ({
  urlForImage: () => ({
    width: () => ({
      height: () => ({
        fit: () => ({ url: () => 'https://cdn.sanity.io/mock-image.jpg' }),
      }),
    }),
  }),
}))
```

with a self-referential chain that accepts any order/combination of builder calls before `.url()` — needed because the new resolver in Step 3 below calls only `.width().url()`, a shorter chain than the existing `.width().height().fit().url()` callers use:

```ts
vi.mock('lib/sanity.image', () => ({
  urlForImage: () => {
    const chain = {
      width: () => chain,
      height: () => chain,
      fit: () => chain,
      url: () => 'https://cdn.sanity.io/mock-image.jpg',
    }
    return chain
  },
}))
```

Then update the three examples in the `describe('buildOrganizationJsonLd', ...)` block that hardcode `` `${siteUrl}/logo.svg` `` — replace each occurrence with `'https://cdn.sanity.io/images/proj/ds/logo-abc123-600x200.png'` (a representative resolved URL; `buildOrganizationJsonLd`'s own behaviour is unchanged, only the example value is stale).

- [ ] **Step 2: Write the failing test for the new resolver**

Add to `lib/json-ld.test.ts`, after the `describe('buildOrganizationJsonLd', ...)` block:

```ts
describe('resolveOrganizationLogoUrl', () => {
  it('returns undefined when no logo is uploaded', () => {
    expect(resolveOrganizationLogoUrl(null)).toBeUndefined()
    expect(resolveOrganizationLogoUrl(undefined)).toBeUndefined()
  })

  it('resolves a Sanity CDN URL when a logo is uploaded', () => {
    const logo = { asset: { _ref: 'image-abc123-600x200-png' } } as Image
    expect(resolveOrganizationLogoUrl(logo)).toBe('https://cdn.sanity.io/mock-image.jpg')
  })
})
```

Add `resolveOrganizationLogoUrl` to the existing import from `./json-ld`, and add `import type { Image } from 'sanity'` alongside the other type imports.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/json-ld.test.ts`
Expected: FAIL — `resolveOrganizationLogoUrl is not defined` (the other tests in this file should still pass, confirming the mock widening in Step 1 did not break existing callers).

- [ ] **Step 4: Implement it**

In `lib/json-ld.ts`, add after `buildOrganizationJsonLd`:

```ts
/**
 * Resolves the JSON-LD Organization's logo to a Sanity CDN URL, or returns
 * undefined so the caller omits it entirely -- schema.org treats
 * Organization.logo as recommended, not required, and pointing structured
 * data at `public/logo.svg` (which reads "HOLSINGLER", a shipped typo) is
 * worse than omitting it. Capped at 600px: this is structured-data
 * metadata, not a rendered asset, so the full-resolution original is
 * unnecessary weight.
 */
export function resolveOrganizationLogoUrl(
  logo: Image | null | undefined
): string | undefined {
  if (!logo) return undefined
  return urlForImage(logo)?.width(600).url()
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- lib/json-ld.test.ts`
Expected: PASS, every case including the pre-existing `buildOrganizationJsonLd` ones.

- [ ] **Step 6: Wire it into the layout**

In `app/layout.tsx`, add `resolveOrganizationLogoUrl` to the existing import:

```ts
import { buildOrganizationJsonLd, resolveOrganizationLogoUrl } from 'lib/json-ld'
```

`Image` is already imported (Task 3). In `RootLayout`, consolidate the settings fetch that already happens three times into one local, then use it at the JSON-LD call site. Replace:

```tsx
  const { isEnabled: isDraftMode } = await draftMode()
  const { siteName } = resolveBranding(await getSettings())
  const { dataTheme, style: brandStyle } = resolveBrandStyle(await getSettings())
```

with:

```tsx
  const { isEnabled: isDraftMode } = await draftMode()
  const settings = await getSettings()
  const { siteName } = resolveBranding(settings)
  const { dataTheme, style: brandStyle } = resolveBrandStyle(settings)
```

and replace:

```tsx
        <JsonLd
          data={buildOrganizationJsonLd({
            name: siteName,
            url: siteUrl,
            logo: `${siteUrl}/logo.svg`,
          })}
        />
```

with:

```tsx
        <JsonLd
          data={buildOrganizationJsonLd({
            name: siteName,
            url: siteUrl,
            logo: resolveOrganizationLogoUrl(settings.logo as Image | null | undefined),
          })}
        />
```

- [ ] **Step 7: Fix the e2e assertion pinned to the old path**

In `e2e/json-ld.spec.ts`, change the top import line from:

```ts
import { expect, type Page, test } from '@playwright/test'
```

to:

```ts
import { expect, type Page, test } from '@playwright/test'
import { siteUrl } from 'lib/site'
```

Replace the last line of the `${path} emits valid Organization JSON-LD` test:

```ts
    expect(organization.logo).toContain('/logo.svg')
```

with:

```ts
    // settings.logo may or may not be uploaded in the shared dataset this
    // suite runs against -- asserting only "not the old broken value"
    // (rather than requiring a CDN URL to be present) keeps this true in
    // both states, instead of accidentally depending on which one happens
    // to be live right now. This is the exact class of trap Phase 4C's
    // cascade e2e test hit: a claim that only held because a CMS field was
    // unset in the shared dataset.
    expect(organization.logo).not.toBe(`${siteUrl}/logo.svg`)
    if (organization.logo !== undefined) {
      expect(organization.logo).toMatch(/^https:\/\/cdn\.sanity\.io\//)
    }
```

- [ ] **Step 8: Delete `public/logo.svg`**

```bash
git rm public/logo.svg
```

- [ ] **Step 9: Verify the whole suite**

```bash
npm run type-check
npm test
npm run build
npm run test:e2e -- json-ld.spec.ts
```

Expected: all pass, including e2e — against the live dataset (`settings.logo` unset today, per [[holsinger-lab-next-up]]'s outstanding manual-verification note) `organization.logo` is `undefined`, which the new assertion accepts.

- [ ] **Step 10: Commit**

```bash
git add lib/json-ld.ts lib/json-ld.test.ts app/layout.tsx e2e/json-ld.spec.ts
git commit -m "fix: resolve the JSON-LD organization logo from settings.logo

Fixes D1 by removing the last consumer of public/logo.svg (which reads
'HOLSINGLER', a shipped typo). Omits the field entirely when no logo
is uploaded rather than pointing structured data at a broken asset."
```

---

## Task 8: New e2e coverage for manifest, robots and viewport; extend `docs/branding.md`

**Files:**
- Create: `e2e/manifest-and-robots.spec.ts`
- Modify: `docs/branding.md` (append an Icons/manifest/robots section)

**Interfaces:**
- Consumes: everything in Tasks 3-6.
- Produces: nothing.

- [ ] **Step 1: Write the e2e coverage**

Create `e2e/manifest-and-robots.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { siteUrl } from 'lib/site'

test('manifest.webmanifest is served with CMS-resolved content', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()

  expect(typeof manifest.name).toBe('string')
  expect(manifest.name.length).toBeGreaterThan(0)
  expect(typeof manifest.short_name).toBe('string')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^(https:\/\/cdn\.sanity\.io\/|\/favicon\/)/)
  }
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
})

test('robots.txt is served with the real siteUrl, not a hardcoded deployment URL', async ({
  request,
}) => {
  const response = await request.get('/robots.txt')
  expect(response.ok()).toBe(true)
  const body = await response.text()

  expect(body).toContain('Allow: /')
  expect(body).toContain(`Sitemap: ${siteUrl}/sitemap.xml`)
})

test.describe('theme-color viewport meta', () => {
  test('emits distinct light and dark scheme entries', async ({ page }) => {
    await page.goto('/')
    const light = page.locator(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
    )
    const dark = page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')

    await expect(light).toHaveAttribute('content', /^#[0-9a-f]{6}$/i)
    await expect(dark).toHaveAttribute('content', /^#[0-9a-f]{6}$/i)

    const lightContent = await light.getAttribute('content')
    const darkContent = await dark.getAttribute('content')
    expect(lightContent).not.toBe(darkContent)
  })
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- manifest-and-robots.spec.ts`
Expected: PASS, four tests. Everything this spec exercises was built in Tasks 4-6, so this proves the real routes over HTTP rather than driving new code.

- [ ] **Step 3: Run the whole e2e suite for regressions**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 4: Extend `docs/branding.md`**

Append to the end of `docs/branding.md`:

```markdown
## Icons, manifest and robots

**Favicon** is uploaded in Studio under **Settings → Branding → Icon**. It drives the PNG
`<link rel="icon">` tags Next serves from `generateMetadata`, at 16×16, 32×32 and 180×180 (the Apple
touch icon), through the same Sanity image pipeline as the logo. `/favicon.ico` is the one exception:
browsers request it at a fixed path outside Next's metadata system, and generating a real `.ico`
requires ICO container encoding — not worth adding here, so `public/favicon/favicon.ico` stays a
static legacy fallback, never CMS-driven. Leaving Icon empty falls back to the site's built-in PNGs.

**`app/manifest.ts`** and **`app/robots.ts`** are generated, not files to hand-edit. Next serves them
at `/manifest.webmanifest` and `/robots.txt` respectively, built from the same CMS settings as
everything else in this document — there is no `public/favicon/site.webmanifest` or
`public/robots.txt` to look for any more.
```

- [ ] **Step 5: Commit**

```bash
git add e2e/manifest-and-robots.spec.ts docs/branding.md
git commit -m "test: cover the generated manifest, robots.txt and viewport theme-color

Also extends docs/branding.md with the icons/manifest/robots section."
```

---

## Task 9: Lab-facing paste-ready `/tutorial` copy

**Files:**
- Create: `docs/tutorial-copy.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

This environment has no Sanity Studio write access (parent spec §7), so this ships as a repo file for the lab to paste into their `/tutorial` document themselves — it is the only Phase 4 deliverable never shipped for 4B or 4C either, not just 4D's own favicon feature.

- [ ] **Step 1: Write the copy**

Create `docs/tutorial-copy.md`:

```markdown
# Branding — paste into the /tutorial page in Studio

The site's look is controlled from **Settings → Branding** and **Settings → Identity** in Sanity
Studio — no code changes needed for any of this. Everything below is optional; leaving a field empty
keeps the site's built-in look.

## Logo

Upload an image under **Logo** and it replaces the text mark in the site header. Any shape works —
the site scales it to fit the header automatically.

If your logo is dark-coloured and would be hard to see on a dark background, also upload a
**Logo (dark mode)** version. It's shown automatically to visitors whose device is set to dark mode —
you don't need to do anything else for this to work.

## Brand colour

Set **Brand colour** to your lab's main colour and the site uses it for links and small accents
(borders, highlights) throughout. Pick any colour — the site automatically adjusts how light or dark
it renders so text and links stay easy to read, in both light and dark mode. There's no colour you
can choose that will make the site hard to read.

**Background tone** offers two overall page tones — a cool grey (the default) or a warm cream —
independent of your brand colour. Try both and see which one fits.

## Icon

Upload a square image under **Icon** and it becomes the small icon shown in browser tabs and when
someone saves the site to their phone's home screen. A simple, recognisable mark works best at small
sizes — think of how small your browser tab icon actually is.

## A note on saving

Changes to any of these fields go live within about a minute of publishing in Studio — no need to
tell anyone or wait for a deploy.
```

- [ ] **Step 2: Commit**

```bash
git add docs/tutorial-copy.md
git commit -m "docs: add lab-facing paste-ready branding copy for /tutorial

Covers logo, brand colour, background tone and icon -- Phase 4's own
handover deliverable, never shipped for 4B or 4C either."
```

---

## Final verification

- [ ] `npm test` — all unit suites pass
- [ ] `npm run type-check` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run test:e2e` — all specs pass
- [ ] Manual: in Studio, upload an Icon and confirm the browser tab favicon updates (allow for aggressive favicon caching — a hard refresh or new profile may be needed to see it)
- [ ] Manual: in Studio, set Background tone to Warm, reload, and confirm the browser's own chrome (address bar area, on supporting browsers/OSes) tints toward the warm surface colour in both light and dark OS colour schemes
- [ ] Manual: upload a Logo in Studio, reload any page, and inspect the `application/ld+json` script tag — confirm `logo` is now a `cdn.sanity.io` URL, then clear it and confirm `logo` disappears from the JSON-LD entirely rather than reverting to `/logo.svg`
- [ ] Manual: visit `/manifest.webmanifest` and `/robots.txt` directly in a browser and confirm both read correctly
- [ ] Paste `docs/tutorial-copy.md`'s content into the live `/tutorial` Sanity document (requires Studio write access this environment lacks) — outstanding until someone with access does it
