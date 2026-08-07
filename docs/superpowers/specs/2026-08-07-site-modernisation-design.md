# Holsinger Lab — Site Modernisation Design

**Date:** 2026-08-07
**Status:** Approved in outline; Phase 0 ready for planning
**Repo:** `where-is-brett/holsinger-lab` — Next.js 13 (Pages Router) + Sanity v3, deployed to Vercel

---

## 1. Context

The site has not been touched since October 2023 (last commit `8483ff4`, 2023-10-20). It builds
cleanly — `tsc --noEmit` and `next lint` both pass with zero errors — which is precisely why its
real problems have gone unnoticed for two and a half years. The failures are not compiler failures;
they are configuration inversions, silent content gating, and client-only rendering.

The audit that produced this document verified findings against three sources: a full production
build, `npm audit`, and live queries against the production Sanity dataset. Claims below are
evidence-backed rather than inferred; the verification commands are in Appendix A.

### 1.1 Headline finding

Three entire sections of the site return 404 in production. The `settings` singleton has
`showPeople`, `showPublications` and `showContactForm` all set to `false`, and each page guard
converts that into `notFound: true`. The build confirms it — `people.html`, `publications.html` and
`contact.html` are never generated.

Behind those 404s sit **19 people profiles and 19 publications** that lab members entered by hand.
None of it is reachable. Restoring it is the single highest-value change available and requires no
framework work.

### 1.2 Why the toggles are off

`initialValue: true` in `schemas/singletons/settings.ts` applies only to *newly created* documents.
The `settings` singleton predates those three fields, so they were never initialised — they read as
`undefined`, and every guard is written as `if (!settings?.showX)`. Undefined therefore fails
*closed*. An editor who has never opened the toggle sees an empty switch and has no indication that
leaving it alone removes a page from the site.

The fix is twofold: make the guards fail *open* (`=== false`), and make the Studio state legible.

---

## 2. Goals

1. Make the content that already exists visible, correct, and discoverable.
2. Get onto a supported, patched dependency baseline.
3. Fix correctness, accessibility and SEO defects.
4. Improve the experience for both readers and Studio editors.

## 3. Non-goals

- Redesigning the visual identity from scratch. Phase 3 refines; it does not rebrand.
- Migrating away from Sanity.
- Content authoring. Where content is missing (e.g. all 19 profiles lack bios) this document flags
  it; filling it is the lab's work, not the codebase's.

---

## 4. Current state

### 4.1 Broken

| # | Issue | Evidence |
|---|---|---|
| 1 | `/people`, `/publications`, `/contact` all 404 | No HTML emitted for them by `next build` |
| 2 | No navigation in server-rendered HTML | Prerendered `index.html` contains only the 4 project links |
| 3 | Tailwind never scans `pages/` | `w-80`, `md:w-[40vw]`, `dark:bg-black` absent from compiled CSS |
| 4 | TS + ESLint errors ignored **in production only** | `next.config.mjs:11-18`, condition is inverted |
| 5 | Zero OG / Twitter / canonical tags emitted | `grep '<meta property' index.html` returns nothing |
| 6 | New content 404s until redeploy | `revalidate` commented out everywhere, `fallback: false` |

**Navigation (#2)** is structural: `components/global/Navbar/Navbar.tsx` gates the whole nav behind
an `isBrowser` state that is `false` during SSG, then chooses mobile vs. desktop from
`window.innerWidth`. Crawlers see a site with almost no internal linking, the nav pops in after
hydration, and no-JS users get nothing. Compounding it, `menuItems` contains exactly one entry.

### 4.2 Security and dependencies

`npm audit`: **49 vulnerabilities — 2 critical, 20 high.**

- `next@13.4.9` — three majors behind; the advisory range covers it.
- `sanity@3.14.1` — v4 is current.
- `axios@1.4.0` — CSRF and SSRF advisories.

Beyond version bumps:

- **`pages/api/formspree.ts` is an open relay.** No auth, no rate limit, no origin check, no
  honeypot, no captcha. It forwards any POST body to the lab's Formspree endpoint.
  (`@formspree/react` is also installed and never imported.)
- **Draft mode ships the Sanity read token to the browser** via `__NEXT_DATA__`
  (`token: draftMode ? readToken : null`). This is how the upstream template works, but it means a
  leaked preview URL leaks dataset read access. Phase 1's preview rewrite removes it.

### 4.3 Correctness defects

| Location | Defect |
|---|---|
| `pages/publications/index.tsx:26` | `if (preview) { return }` — returning nothing from a component throws. Draft mode on this route crashes. |
| `components/shared/ImageBox.tsx:22`, `ProjectListItem.tsx:26` | Sanity hotspots are **fractions (0–1)**, passed here as pixel dimensions. Currently masked because no hotspots are set, so it falls back to 3500×2000 — verified upscaling a 1222×596 source. The first hotspot an editor sets will request `w=0.85`. |
| `components/shared/CustomPortableText.tsx:74-86` | `internalLink` is defined in `schemas/documents/page.ts:91` but has no renderer. Internal links render as unlinked plain text. |
| `components/pages/publications/Publications.tsx:15` | `<div>` as a direct child of `<ul>` — invalid HTML, breaks list semantics for screen readers. |
| `components/pages/people/Profile.tsx:53`, `publications/Toggle.tsx:7` | `<a onClick>` with no `href` — not focusable, not keyboard-operable. |
| `components/global/Navbar/MobileNavBar.tsx:20-29` | `preventDefault()` + `setTimeout(500)` before navigating. Breaks cmd-click and open-in-new-tab; adds 500 ms to every tap. |
| `components/global/PreviewNavbar.tsx:19` | Drops all three toggle props, so preview renders a different nav than production. |
| `schemas/documents/page.ts:184` | Dead `slugify()` whose only behaviour is `throw new Error('Function not implemented')`. |
| `pages/api/revalidate.ts:67` | Fallback case revalidates 11+ paths in a single request — timeout risk. The `page` case also reports `"Revalidated homepage"` when it did not. |

### 4.4 SEO

No `robots.txt`. No `sitemap.xml`. No structured data. No canonical URLs. `SiteMeta` emits only a
conditional `og:image`, and `settings.ogImage` is unset — so social shares render blank.

Heading structure is wrong: the homepage `<h1>` is *"Our Research Projects"*, while the lab name
renders as a `<div>` (`components/shared/Header.tsx:21`).

### 4.5 Content hygiene

**Resolved 2026-08-07** (see §5.0): 6 redundant drafts and the `/Not active` page deleted; the
remaining 4 drafts published or discarded. The dataset now holds zero drafts.

Published document counts as of 2026-08-07: **19 profiles, 19 publications, 5 projects, 4 pages.**
(Earlier figures in this document counted drafts alongside published documents; these are the
draft-excluded totals.)

Outstanding:

- **URLs with spaces and capitals** — `/Miscellaneous`, `/projects/MAESTRO`,
  `/projects/Publication highlights`. The slug field sets `source: 'title'` but never enforces
  slugification.
- **All 19 profiles lack bios**, so the expand affordance on every People card is dead UI. Two
  profiles have no image and render a blank grey box.
- No `ogImage`; no image hotspots anywhere in the dataset.

### 4.6 Code quality

- **10 unused dependencies**: `@vercel/og`, `@formspree/react`, `@fortawesome/react-fontawesome`,
  `next-google-fonts`, `intl-segmenter-polyfill`, `classnames`, `date-fns`, `@sanity/color-input`,
  `@sanity/webhook`, `react-is`.
- **Five styling systems**: Tailwind, MUI, Emotion, styled-components, Headless UI — MUI is pulled
  in for exactly two icons.
- **No tests. No CI.** `.github/` holds only Sanity's `renovate.json` and a `CODEOWNERS` assigning
  the repo to `@sanity-io/ecosystem`.
- **Loose types**: `strict: false`; `People`, `Profile`, `Publications`, `Publication`, `Toggle`,
  `Contact`, `DesktopNavBar` and `MobileNavBar` all take implicit-`any` props.
- `publicationsQuery` is `{...}` — it fetches every field of every publication.
- ESLint extends `next` rather than `next/core-web-vitals`, disabling the a11y and perf rules that
  would have caught several defects above.
- Template leftovers: `netlify.toml` (deployment is Vercel), `ScrollUp.tsx` (works around an
  App-Router bug that does not apply to the Pages Router), `lib/demo.data.ts`, `@sanity/demo` as the
  Tailwind theme source, an empty `dist/`.

---

## 5. Plan

Four phases, each independently shippable. Sequencing decision: **hotfix before upgrade**, so the
dead content goes live in days rather than waiting on a migration.

### Phase 0 — Unblock

Ship existing content and stop the bleeding. Stays on Next 13; no dependency changes; minimal
regression surface.

#### 5.0.1 Completed 2026-08-07

Deleted from the production dataset (transaction `xMEKTHieV97c1BqxLW1o3E`), after verifying each was
byte-identical to its published version or entirely empty:

- `drafts.home`, `drafts.settings`
- `drafts.50d7429d-…` (empty page stub, all fields null)
- `drafts.82ec0178-…` (project MAESTRO)
- `drafts.3c638bbb-…` (publication INPP5D/SHIP1)
- `0df826a1-…` — the published `/Not active` page

A full JSON backup of all 10 candidate documents was taken before deletion.

#### 5.0.2 Draft resolution — completed 2026-08-07

The remaining four drafts contained genuine unpublished work and were resolved by the lab
(transaction `CExpR06NzHRSckuOd4kx13`):

| Draft | Content | Outcome |
|---|---|---|
| `drafts.214fe01d-…` | **Fritz Graham**, Study Abroad Student, has profile image | **Published** |
| `drafts.b3d44cb4-…` | **Jiyoo Choi**, Undergraduate — Diagnostic Radiography, no image | **Published** |
| `drafts.e290b817-…` | **"Tutorial"** page, 58 body blocks: *"This page demonstrates how to update the website."* | **Published** at `/tutorial` |
| `drafts.70a1e162-…` | **"Miscellaneous"** page — changed the MAESTRO link to `tinyurl.com/maestrotalks` | **Discarded**; published page retains `tinyurl.com/ycce8zbu` |

Both profiles carried `orderRank` values sorting after the existing last entry, so they appear at the
end of the People list. The dataset now holds **zero drafts**.

Two follow-ups arising from this:

- **`/tutorial` is now a public, crawlable URL** containing internal CMS documentation. Phase 0 item
  4 generates a sitemap, which would list it. Decide whether to `noindex` the page, gate it, or
  accept it as public.
- Jiyoo Choi's role reads *"Ungergraduate student"* — a typo in content, not code. Left as-is.

#### 5.0.3 Work items

1. **Restore the three sections.** Change each guard from `!settings?.showX` to
   `settings?.showX === false` so unset fails open (`pages/contact/index.tsx:26`,
   `pages/people/index.tsx:47`, `pages/publications/index.tsx:62`). Set all three explicitly to
   `true` in the dataset. Add Studio field descriptions stating plainly that disabling a toggle
   makes the page return 404.
2. **Fix `tailwind.config.js` content globs** — add `./pages/**/*.{js,ts,jsx,tsx}`; remove the
   non-existent `./app/**` and `./intro-template/**`.
3. **Un-invert `next.config.mjs`** — `ignoreBuildErrors` and `ignoreDuringBuilds` become `false`
   unconditionally, so type and lint errors fail the build everywhere.
4. **SEO baseline** — emit `og:title`, `og:description`, `og:url`, `og:type`, `twitter:card` and
   `<link rel="canonical">` from `SiteMeta`; add `robots.txt` and a generated `sitemap.xml`;
   promote the page title to a real `<h1>` and demote *"Our Research Projects"* to `<h2>`.
5. **Slug hygiene** — add a schema validation rule rejecting spaces and uppercase; slugify on input.
   Fix the three offending slugs and add 301s from the old URLs.
6. **Harden `/api/formspree`** — honeypot field, per-IP rate limit, same-origin check. Document
   `FORMSPREE_ENDPOINT` in `.env.local.example`, where it is currently missing.
7. **Re-enable ISR** — uncomment `revalidate` in all six `getStaticProps`; switch both
   `getStaticPaths` to `fallback: 'blocking'` so new documents do not require a redeploy.

**Exit criteria:** `/people`, `/publications` and `/contact` return 200 and are present in the build
output; `w-80` and `md:w-[40vw]` appear in the compiled CSS; the homepage emits a complete OG tag
set; a newly published Sanity document appears without a redeploy.

### Phase 1 — Foundations: upgrade and App Router

Decision taken: **migrate to the App Router**. The app is small — 6 routes, 35 components — and the
migration fixes the server-rendering problem structurally rather than patching it.

1. Next 13.4.9 → 15; React 18 → 19; Sanity 3.14 → 4; next-sanity 5 → 11; Tailwind 3 → 4.
2. Migrate `pages/` → `app/`. `getStaticProps` + `<Head>` become server components +
   `generateMetadata` + `generateStaticParams`, which makes Phase 0's SEO work declarative and
   removes the per-page data-fetching boilerplate.
3. Replace `next-sanity/preview`'s `useLiveQuery` with the current draft-mode API. **This removes
   the read token from `__NEXT_DATA__`** (§4.2).
4. Sanity `deskTool` → `structureTool`.
5. Remove the 10 unused dependencies; drop MUI + Emotion (two icons → inline SVG); `axios` →
   `fetch`; delete `netlify.toml`, `ScrollUp.tsx`, `lib/demo.data.ts`, `@sanity/demo`, `dist/`, and
   the Sanity `CODEOWNERS`.
6. `strict: true`; type the eight implicit-`any` components; generate typed GROQ via Sanity TypeGen;
   narrow `publicationsQuery` from `{...}` to explicit fields.
7. ESLint → `next/core-web-vitals`. GitHub Actions running typecheck, lint and build on every PR.
   Reconfigure Renovate for this repo.

**Open decision inside this phase:** Tailwind 4 moves theme configuration to CSS-first, and the
current theme is inherited from `@sanity/demo`. This is the natural moment to define the lab's own
design tokens. To be proposed when the phase is planned.

### Phase 2 — Correctness, accessibility, SEO

1. **Server-rendered navigation** on CSS breakpoints; delete the `isBrowser` gate and the 500 ms
   `setTimeout`. Mobile menu gains focus trap, Escape-to-close, `aria-expanded`, and scroll lock.
2. `<a onClick>` → `<button>` throughout; fix the `<ul>` markup; full heading-hierarchy pass.
3. **Image pipeline** — correct hotspot/crop handling, real `sizes`, explicit aspect ratios, blur
   placeholders, fallback avatar for image-less profiles. Ends the 3500×2000 upscaling.
4. `internalLink` renderer; consistent `target`/`rel` on external links.
5. **JSON-LD** — `Organization` for the lab, `Person` per profile, `ScholarlyArticle` per
   publication. Materially valuable for a research group.
6. Preview parity across all document types, not just home/page/project.
7. **Tests** — Vitest over pure logic (`resolveHref`, image URL construction, citation formatting);
   Playwright smoke tests per route with axe accessibility assertions.

### Phase 3 — UX/UI

**Readers**

- Publications: search; filter by year, author and journal; copy-citation (APA and BibTeX); DOI
  links; per-year jump navigation.
- People: grouping by role (PI / postdoc / student / alumni); real bios; improved cards.
- Projects: richer detail pages; related publications; project status.
- Dark mode that actually compiles.
- Typography and spacing system pass — the current design is the Sanity template with a green/yellow
  palette substituted.

**Admins**

- Restructured Studio desk; orderable publications; clearer singleton editing.
- Field-level help and validation, especially around the section toggles.
- Preview for every document type.
- **DOI lookup → autofill** for publications. Given that 20 entries were typed by hand with full
  metadata, this is likely the largest single quality-of-life win available.

---

## 6. Open questions

1. `/tutorial` (§5.0.2) is now public and will land in the generated sitemap. `noindex`, gate, or
   leave public?
2. The deleted `/Not active` page contained only a pointer to
   `https://damianholsinger6.wixsite.com/holsinger-lab`, and was last edited 2026-07-06. Is that Wix
   site live, and does it supersede or coexist with this one? This affects whether Phase 3 is worth
   its cost.
3. Tailwind 4 theme tokens (Phase 1) — adopt lab-specific design tokens, or port the existing
   palette as-is?

---

## Appendix A — Verification

```bash
# Section toggles and content counts
# (queries lib/sanity.api.ts credentials from .env.local)
npm run build                       # people/publications/contact emit no HTML
npm audit                           # 49 vulns: 2 critical, 20 high
npx tsc --noEmit && npx next lint   # both pass — the defects are not type errors

# Tailwind purge
grep -c 'w-80' .next/static/css/*.css        # 0
grep -c 'md\\:w-\[40vw\]' .next/static/css/*.css  # 0

# Missing metadata
grep -oE '<meta property="og:[^"]*"' .next/server/pages/index.html   # no matches

# Navigation absent from SSG output
grep -oE 'href="/(people|contact|publications)"' .next/server/pages/index.html  # no matches
```

## Appendix B — Deletion backup

Pre-deletion JSON snapshot of all 10 candidate documents (including the 4 that were kept):

```
/private/tmp/claude-501/-Users-brett-Documents-GitHub-LMND-nosync/\
e0caf0b5-6d40-4f4b-9a14-864a00e81a05/scratchpad/sanity-deletion-backup.json
```

This path is session-scoped and will not survive indefinitely. It is deliberately **not** committed
to the repository, since it contains CMS content and the repo may be public. Move it somewhere
durable if the deletions may need reverting.
