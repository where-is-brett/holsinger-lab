# Phase 4D — Icons, Manifest, OG

**Date:** 2026-08-17
**Status:** Approved; ready for planning
**Parent spec:** `2026-08-12-site-branding-customisation-design.md` §3.4, §3.5 and §4
**Depends on:** Phase 4A (merged PR #14), Phase 4C (merged PR #17)

This document scopes the last sub-phase of the branding programme. It re-verifies the parent spec
against a fresh read of `origin/main` (`0639f9b`), per the programme's standing instruction. Unlike
4C — where the specified colour algorithm was wrong in both direction and method — 4D's parent
section (§3.4/§3.5) holds up: every defect it names is still live, every field/type it assumes still
matches the schema, and no correction to the *design* was needed. What changed since the parent spec
was written is that two of its prerequisites already shipped ahead of schedule, which shrinks 4D's
actual footprint below what §3.4 reads as.

Constraints inherited from the parent spec's preamble, both load-bearing here:

1. Anything left in code is **frozen permanently** — no developer will maintain this repo after
   handover.
2. This environment has no Sanity Studio login or write token (§7) — reads against the live dataset
   work, interactive verification does not.

---

## 1. Starting state, verified

**Still-open defects (parent spec §1.1), confirmed live today:**

| # | Defect | Verified |
|---|---|---|
| D1 | `public/logo.svg` reads "HOLSINGLER" | File still present, still referenced at `app/layout.tsx:149` |
| D2 | `site.webmanifest` says `"name": "Next.js"` / `"short_name": "Next.js"` | Confirmed verbatim |
| D3 | Manifest icon paths are `/favicons/…` (plural); real directory is `/favicon/` (singular) | Confirmed — both icons 404 |
| D4 | `browserconfig.xml` has the same `/favicons/` path defect | Confirmed verbatim |
| D6 | `viewport.themeColor` is a flat `'#F8F8F8'` | Confirmed, still a static export |
| D7 | `robots.txt` hardcodes `holsingerlab.vercel.app` | Confirmed |

D5 (mobile tap-overlay geometry) and D8 (sticky-bar height) were fixed by 4B. D9 (vitest worktree
leakage) was fixed pre-4A (`vitest.config.ts` already excludes `**/.claude/**`). None of these three
need touching.

**Groundwork already in place, narrowing 4D's actual work:**

- `generateMetadata()` is already async (shipped in 4A) — only `viewport` remains a static export.
  4D converts *one* function, not two.
- `lib/json-ld.ts`'s `buildOrganizationJsonLd` already accepts an optional `logo` param with a doc
  comment naming this exact behaviour ("Phase 4D supplies a Sanity CDN URL … and omits it
  otherwise"). Only the call site (`app/layout.tsx:149`, currently `` `${siteUrl}/logo.svg` ``) needs
  to change — the function itself does not.
- `settings.ogImage` and full OpenGraph/Twitter metadata (`lib/metadata.ts`) were built in an earlier
  phase and work today. "OG" in this sub-phase's name refers only to the JSON-LD organization logo,
  not new Open Graph work — confirmed against the parent spec's own §3.4 text, which never mentions
  building OG metadata.
- `docs/branding.md` (developer-facing docs) already exists, written during 4C. §3.5 asked 4D to
  create it; 4D now extends it with an Icons/Manifest/Robots section instead.
- No lab-facing `/tutorial` paste-ready copy has been delivered for **any** part of Phase 4 yet (not
  4B's logo, not 4C's colour, not 4D's favicon). §3.5 assigns this to 4D and that is still accurate
  — it was never done early.

**Schema placement, confirmed against parent spec §3.1's table:** `icon` is a Branding-group `image`
field, alongside `logo`/`logoDark`/`theme`/`brandColor` — not Identity. `schemas/singletons/settings.ts`
groups are unchanged since 4C; `icon` slots in after `logoDark`.

**No corrections to the parent spec's design were needed.** The only adjustments here are scope
*subtractions* (work already done) and one scope *clarification* (OG = JSON-LD logo only), not fixes
to anything wrong.

---

## 2. Design

### 2.1 CMS favicon

`settings.icon` (new Branding field, optional `image`) drives PNG icons through the existing
`urlForImage` pipeline: `urlForImage(icon).width(n).height(n).format('png')` for the 32×16 sizes
`generateMetadata` already declares. `/favicon.ico` is requested by browsers at a fixed path outside
Next's metadata system; generating a real `.ico` requires ICO container encoding, which is not worth
adding for a repo nobody will maintain. The existing static `public/favicon/favicon.ico` remains as
the legacy fallback while the explicit `<link rel="icon">` PNGs — which browsers prefer when both are
present — become CMS-driven. This is a documented limitation, not an oversight; it goes in
`docs/branding.md`.

When `settings.icon` is unset, `generateMetadata`'s `icons` block falls back to today's static PNG
paths — same pattern as every other optional CMS field in this codebase (fallback chain, never a
broken empty state).

### 2.2 `app/manifest.ts`

Replaces `public/favicon/site.webmanifest`. Returns `MetadataRoute.Manifest` built from resolved
`siteName`/`shortName` (via `resolveBranding`, same helper `generateMetadata` already uses),
CMS icon URLs (same fallback as 2.1, at manifest-appropriate sizes — 192/512), and a `theme_color`
sourced from the same resolved palette as §2.4's viewport colour (light value). Next.js auto-links a
file-convention manifest, so `app/layout.tsx`'s hardcoded `manifest: '/favicon/site.webmanifest'`
entry is deleted along with the static file.

### 2.3 Dead IE/Edge-Legacy artifacts

`browserconfig.xml`, the `msapplication-*` entries in `generateMetadata`'s `other` block, and
`mstile-150x150.png` are deleted outright, not fixed. They target IE11 (EOL June 2022) and Edge
Legacy (EOL March 2021); repairing dead technology in an unmaintained repo is worse than removing it
(D4 closes by deletion, not by fixing the path).

### 2.4 `generateViewport()`

Converts the static `viewport` export to an async function, mirroring `generateMetadata`'s existing
shape (same `getSettings()` cached fetch, same `resolveBrandStyle`/theme resolution already built in
4C). Returns `themeColor: [{ media: '(prefers-color-scheme: light)', color: … }, { media:
'(prefers-color-scheme: dark)', color: … }]` sourced from `PRESET_SURFACES[theme].light[0]` /
`.dark[0]` — the same preset-resolution path 4C's injected `<style>` block already uses, so there is
one source of truth for "what the active theme's base surface colour is," not two. Fixes D6.

### 2.5 `app/robots.ts`

Replaces `public/robots.txt`. Returns `MetadataRoute.Robots` built from `siteUrl` (`lib/site.ts`),
matching the existing `Allow: /` + sitemap shape but no longer hardcoding a deployment URL. Fixes D7.

### 2.6 JSON-LD logo

`app/layout.tsx`'s `buildOrganizationJsonLd` call changes from the hardcoded
`` logo: `${siteUrl}/logo.svg` `` to a resolved Sanity CDN URL via `urlForImage(settings.logo)` when a
logo is uploaded, and omits `logo` entirely when it is not (`buildOrganizationJsonLd`'s `logo` param
is already optional — see §1). `schema.org` treats `Organization.logo` as recommended, not required,
so an absent field is valid structured data; pointing it at a file containing a typo is not. Fixes D1
by removing the last consumer.

### 2.7 Delete `public/logo.svg`

Safe once §2.6 lands — 4B already removed every rendering consumer, so JSON-LD is the only reference
left in the live tree (the stale worktrees with their own copies were removed as pre-4D housekeeping,
not part of this sub-phase's diff).

### 2.8 Documentation

- **`docs/branding.md`**: add an "Icons, manifest and robots" section — the favicon fallback
  limitation (§2.1), where `icon` lives in Studio, and that manifest/robots are now generated, not
  static files to hand-edit.
- **Lab-facing `/tutorial` copy**: a new repo file (`docs/tutorial-copy.md`) with paste-ready prose
  for Sanity's `/tutorial` document, covering the full Phase 4 feature set for a non-technical editor
  — uploading a logo (4B), setting a brand colour and background tone (4C), and uploading a favicon
  (4D). No Studio write access exists in this environment (§7 of the parent spec), so this ships as a
  file for the lab to paste in themselves, not a live edit.

---

## 3. Testing

**Unit (Vitest):**
- `lib/json-ld.test.ts` — currently asserts the old `/logo.svg` path (parent spec §5 already flagged
  this); update for the new resolved-URL-or-omitted behaviour, covering both branches
- New coverage for `app/manifest.ts` and `app/robots.ts` output shape
- `generateViewport` — both colour-scheme entries resolve correctly per theme, reusing 4C's
  `PRESET_SURFACES` fixture data rather than duplicating it

**E2E (Playwright):**
- `e2e/json-ld.spec.ts:34` currently asserts `.toContain('/logo.svg')` — parent spec §5 already
  flagged this; update to assert the new behaviour
- New coverage: manifest is served at `/manifest.webmanifest` (Next's file-convention route for
  `app/manifest.ts`) with CMS-resolved content; `robots.txt` is served with the correct
  `siteUrl`-based sitemap line

**Manual, requires access this environment lacks (§7 of parent spec):** Studio rendering of the new
`icon` field; a real favicon upload exercising the CMS pipeline end-to-end in a browser tab
(favicons are cached aggressively client-side, so even a live check has limited signal).

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| `generateViewport` fetch failure takes down `themeColor` for every route, including `/studio` | Reuses `getSettings()`'s existing try/catch → `fallbackSettings` path; no new fetch, no new failure mode |
| Deleting `public/logo.svg` before the JSON-LD call site is updated leaves a 404'ing reference | Sequenced as one task (§2.6 lands with §2.7 in the same change, not two separate ones) |
| Favicon fallback (static `.ico`, CMS PNGs) reads as inconsistent to a future maintainer | Documented explicitly in `docs/branding.md`, matching the parent spec's own framing (§3.4: "a documented limitation rather than glossed") |
| `/tutorial` copy drifts from the live Studio schema after this ships | Out of this sub-phase's control (no write access); flagged in the copy's own file as "paste and verify field names before publishing" |

---

## 5. Out of scope

Unchanged from the parent spec's §8: fonts, generated OG image fallback (satori cannot load
`.woff2`), Studio title, per-page branding overrides, directly editing `/tutorial` content, and
`siteUrl` itself.

**Also out of scope for this sub-phase specifically:** the two other local worktrees found during
scoping (`worktree-phase-0-unblock`, `worktree-phase-1c-tailwind`) were left alone — only the four
worktrees for branches already merged via numbered PRs (4A, 4B, image-fixes, lab-head-spotlight) were
cleaned up as pre-work, since those two remaining ones were not confirmed merged and cleaning them up
was not part of what this session was asked to do.
