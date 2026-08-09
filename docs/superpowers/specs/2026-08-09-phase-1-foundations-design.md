# Phase 1 — Foundations: Upgrade and App Router

**Date:** 2026-08-09
**Status:** Approved; ready for planning
**Parent spec:** [`2026-08-07-site-modernisation-design.md`](2026-08-07-site-modernisation-design.md) §5 "Phase 1 — Foundations: upgrade and App Router"
**Baseline:** `main` @ `7c4512e` (Phase 0 merged via PR #1, CI green)

This document resolves the parent spec's open decisions for Phase 1, records where
verification contradicted the parent spec, and defines the sub-phase split. It supplements
§5 rather than replacing it; where the two disagree, this document is current.

---

## 1. Corrections to the parent spec

The parent spec's Phase 1 section was written against a dependency landscape that no longer
holds. Each correction below was verified against the npm registry and the packages' own
metadata on 2026-08-09.

### 1.1 The version targets are unreachable as written

| Package | §5 target | Current | Current major released |
|---|---|---|---|
| `next` | 15 | **16.3.0** | 2025-10-22 |
| `sanity` | 4 | **6.9.1** | 2026-06-11 |
| `next-sanity` | 11 | **13.3.1** | 2026-05-21 |
| `react` | 19 | **19.2.8** | — |
| `tailwindcss` | 4 | **4.3.3** | — |

This is not merely "newer versions exist." The three Sanity Studio plugins this repo depends
on all declare `sanity: "^5 || ^6.0.0-0"` and `react: "^19.2"` at their latest versions:

- `sanity-plugin-media@6.1.1`
- `sanity-plugin-asset-source-unsplash@7.0.21`
- `@sanity/orderable-document-list@2.0.18`

**Sanity 4 is no longer supported by this repo's own plugins.** Targeting it would require
pinning a bespoke constellation of older plugin releases. Separately,
`next-sanity@13.3.1` requires `next: ^16`, `sanity: ^5.29 || ^6`, `react: ^19.2.3`,
`styled-components: ^6.1` and `@sanity/client: ^7.26.1` — so the target set is forced to move
together.

**Decision:** target current latest. Every peer range resolves cleanly at latest, which makes
this the *simpler* option as well as the better-supported one.

| Package | From | To |
|---|---|---|
| `next` | 13.4.9 | 16.3.0 |
| `react` / `react-dom` | 18.2.0 | 19.2.x (≥ 19.2.3) |
| `sanity` / `@sanity/vision` | 3.14.1 | 6.9.1 |
| `next-sanity` | 5.1.0 | 13.3.1 |
| `@sanity/client` | 6.1.7 | 7.26.2 |
| `styled-components` | 5.3.11 | 6.5.1 |
| `@headlessui/react` | 1.7.x | 2.2.10 |
| `@portabletext/react` | 3.0.4 | 7.0.1 |
| `@sanity/image-url` | 1.0.2 | 2.1.1 |
| `tailwindcss` | 3.3.2 | 4.3.3 |

Node ≥ 20.9.0 is required by Next 16. Local is v22.22.1 and CI pins Node 22 — no change needed.

### 1.2 Two more unused dependencies than the spec counted

§4.6 lists 10 unused dependencies. Verification found two more, bringing the removal set to 12
before the MUI/Emotion/axios removals:

- **`@tailwindcss/typography`** — the `prose` class appears in **zero** files. The plugin is
  loaded in `tailwind.config.js` and compiles utilities nothing uses.
- **`@babel/core`** — a direct dependency with no `.babelrc`, no `babel.config.*`, and no
  `"babel"` key in `package.json`. Next uses SWC. Added by commit `12818b2` ("Upgrade babel"),
  presumably to satisfy an advisory on a transitive copy; as a direct dependency it is inert.

### 1.3 `ScrollUp.tsx` is not dead code

§4.6 lists it as a template leftover to delete. It is imported and rendered by three
components — `HomePage.tsx:59`, `Page.tsx:46`, `ProjectPage.tsx:114`. Its own docstring says it
works around [vercel/next.js#42492](https://github.com/vercel/next.js/issues/42492).

Deleting it is therefore a small behavioural edit in three files, not an unreferenced-file
removal, and it belongs in **1B** (where the App Router makes it moot) rather than 1A.

### 1.4 `dist/` is not tracked

§4.6 calls for deleting an empty `dist/`. It does not appear in `git ls-tree origin/main`, and
`.gitignore` covers `/studio/dist` but not a root `dist/`. It exists only in local working
copies. The repo-level action is a `.gitignore` entry, not a deletion.

### 1.5 The Tailwind theme in effect is smaller than the config implies

`tailwind.config.js` reads:

```js
theme: {
  ...theme,                       // @sanity/demo: borderRadius, colors, fontFamily, screens, extend
  fontFamily: { ... },
  extend: { colors, screens, borderColor },   // ← overwrites the spread's `extend` entirely
}
```

Object-literal key order means the local `extend` **replaces** `@sanity/demo`'s `extend`, so the
demo theme's spacing scale and its `typography` prose variables are silently discarded today.
"Port the existing theme" therefore means porting what is actually in effect, which is less than
the file appears to declare.

### 1.6 Vulnerability baseline: two numbers, two denominators

`npm audit` on `7c4512e` reports **49 vulnerabilities — 2 critical, 21 high, 23 moderate, 3 low**.
The 168 figure from GitHub is Dependabot counting one alert per dependency *path*; `npm audit`
deduplicates per advisory per package. Both are recorded before and after so the comparison is
like-for-like.

---

## 2. Resolved open decisions

### 2.1 Tailwind 4 theme tokens (parent spec §6 Q3)

**Decision: port the existing palette as-is, and prune what is provably dead.**

Measured usage across the whole codebase:

| Utility group | Usages | Detail |
|---|---|---|
| Numbered palette | 32 | `gray` and `blue` only |
| Custom colours | 10 | `bg-background` ×7, `border-primary` ×3 |
| Font families | 24 | `font-ariana` ×11, `font-antarctican` ×6, `serif` ×3, `sans` ×2, `mono` ×2 |
| `prose` | **0** | plugin removed (§1.2) |
| `tall:` screen | **0** | config removed |
| `secondary` / `dark` / `light` | **0** | config removed |

Because `@sanity/demo` is being deleted, the current values must be written down explicitly
regardless. The only real choice is *which* values to write down. Pinning the current ones gives
a zero-diff migration; inventing new ones makes visual design decisions inside a migration phase
and pre-empts Phase 3, which already owns the "typography and spacing system pass."

The scales in use resolve to these `@sanity/color` values, which the `@theme` block pins:

```
gray-50  #f2f3f5    gray-500 #8690a0
gray-100 #e6e8ec    gray-600 #6e7683
gray-200 #ced2d9    gray-800 #3f434a
gray-300 #b6bcc6    gray-900 #272a2e
blue-600 #1e61cd
primary  #2D6A4F    background #F8F8F8
```

Pinning is load-bearing, not ceremonial: Tailwind 4's default `gray-600` is `#4b5563` against
Sanity's `#6e7683`. Adopting defaults would shift every one of the 32 usages.

Tailwind 4 changes the default border colour to `currentColor`. Verified non-issue here — every
bare `border` is paired with an explicit `border-gray-300` (`ContactForm.tsx:145,159,172`).

### 2.2 Sub-phase split

**Decision: three sub-phases, each independently shippable, each its own PR and review.**

The parent spec's Phase 1 is one list of seven items, but those items have very different
coupling. The dependency bumps are mutually forcing — React 19 ⟺ Sanity 6 ⟺ next-sanity 13 ⟺
no `useLiveQuery` ⟺ App Router — while roughly half the item list is version-independent
cleanup. Splitting on that seam keeps the irreducibly-coupled work in one reviewable unit and
gets everything else out of its way first.

---

## 3. Sub-phase 1A — Groundwork

**Constraint:** no dependency *upgrades*, only removals. Stays on Next 13 / React 18 / Sanity 3
so the existing CI gate applies unchanged.

**Rationale:** every item here is independent of both the router and the framework version.
Doing them first shrinks what 1B has to migrate, and flipping `strict: true` on the stable
Pages Router codebase means App Router code in 1B is written strict from the start rather than
having strictness retrofitted at the end of a large migration.

1. **Remove 17 packages.** The 10 from §4.6, plus `@tailwindcss/typography` and `@babel/core`
   (§1.2), plus `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
   after inlining the two icons in `Profile.tsx` as SVG, plus `axios` after `ContactForm.tsx`
   moves to `fetch`. `@sanity/demo` stays until 1C — `tailwind.config.js` still imports it.
2. **Move `getAllPaths`** from `pages/api/revalidate.ts` to `lib/paths.ts`. Today
   `pages/sitemap.xml.tsx` imports from an API route; both sides move in 1B, and the shared
   helper should not be the thing that couples them.
3. **Replace `lib/demo.data.ts`** with a `siteName` constant in `lib/site.ts`. Its entire
   content is `title = 'Holsinger Lab'`; `SiteMeta` consumes it for the title fallback and
   `og:site_name`.
4. **Narrow `publicationsQuery`** from `{...}` to the explicit `PublicationPayload` fields.
5. **Delete** `netlify.toml` and `.github/CODEOWNERS`; add `/dist` to `.gitignore` (§1.4).
6. **Type the implicit-`any` components, then set `strict: true`** and fix the fallout. Verified
   by actually flipping the flag and reading `tsc`'s output rather than guessing: the parent
   spec's list of eight is close but not exact. The real set of component prop signatures needing
   types is `DesktopNavBar`, `MobileNavBar`, `Contact`, `ErrorDialog`, `SuccessScreen`, `People`,
   `Profile`, `Publication`, `Publications`, and both exports of `Toggle.tsx` — plus `pages/404.tsx`,
   which the spec's list omits. `CustomPortableText.tsx`'s block/mark/list handlers turned out to
   need **no** changes: the `components: PortableTextComponents` annotation on the object they
   belong to contextually types every nested handler, so `strict` raises nothing there. The
   remaining fallout is outside `components/` entirely — five Studio/schema-layer errors in
   `plugins/settings.tsx`, `sanity.config.ts` (via `schemas/objects/timeline.ts`'s preview
   `prepare` typing), and the `Rule.custom` validators in `schemas/documents/{page,project,
   publication}.ts`, which currently type their callback parameter as non-optional when Sanity's
   `CustomValidator` always calls back with `T | undefined`.
7. **ESLint → `next/core-web-vitals`**; reconfigure `.github/renovate.json` for this repo
   (it currently inherits `sanity-io/renovate-config` presets intended for Sanity's own repos).

**Verified, not a judgment call.** The parent spec's Phase 1 planning draft assumed
`next/core-web-vitals` would newly enable `jsx-a11y` and surface Phase 2's `<a onClick>`-without-
`href` and `<div>`-in-`<ul>` defects, requiring some rules to be downgraded to `warn` so the build
would still pass. Tested directly by flipping the config and running `next lint`: this is false.
`next/core-web-vitals` only adds `@next/next`'s web-vitals-specific rules (`no-html-link-for-pages`,
`no-sync-scripts`, etc.) on top of the base `next` config — it does not add or elevate any
`jsx-a11y` rules. The base `next` config both repos share already ships a small fixed set of
`jsx-a11y` rules, all pinned to `warn`, none of which is `anchor-is-valid` (the rule that would
catch a href-less `<a onClick>`). The `<div>`-in-`<ul>` defect isn't an ESLint concern at all — no
rule in either config catches invalid DOM nesting. Net effect: switching to
`next/core-web-vitals` is a clean, silent no-op for this codebase's lint output today — `next
lint` reports zero warnings before and after. No rule downgrades are needed.

**Exit criteria.** `tsc --noEmit`, `next lint`, `next build` green on Next 13; `strict: true`
active; 17 packages removed; no behavioural change to any route.

## 4. Sub-phase 1B — Upgrade and App Router

The largest and highest-risk unit. Sequenced so **every commit builds** rather than landing one
atomic multi-file diff — this preserves `git bisect` and gives the final whole-branch review
readable increments.

1. **Bump dependencies and strip the old preview system.** Delete `PreviewProvider`, the four
   `*Preview.tsx` components, and the `preview` branches in each page; drop `token` from page
   props; `deskTool` → `structureTool` (`sanity/desk` → `sanity/structure`). Green on Next 16
   with the Pages Router still in place. Preview is temporarily unavailable.

   **This commit alone lands the security fix.** Once `token` leaves page props it stops being
   serialised into `__NEXT_DATA__` (parent spec §4.2), so the client-exposed read token is gone
   before any router work begins.

2. **Migrate routes to `app/`.** The root layout absorbs `_app.tsx`'s font CSS variables and
   `_document.tsx`'s `<body>` classes. Seven routes plus `not-found.tsx`, each converting
   `getStaticProps` + `SiteMeta` into a server component with `generateMetadata` and, where
   applicable, `generateStaticParams`. Both routers coexist in Next, so routes move
   incrementally; `_app.tsx` and `_document.tsx` are deleted with the last one.

3. **API routes → route handlers.** `formspree`, `revalidate`, and draft-mode enable/disable.
   `pages/sitemap.xml.tsx` becomes `app/sitemap.ts` using Next's built-in convention.

4. **Studio → `app/studio/[[...tool]]/page.tsx`** via `next-sanity/studio`. The current route
   nests `StudioProvider` and `StudioLayout` *inside* `NextStudio`, which already renders them;
   this collapses to the supported form and drops the `styled-components` `createGlobalStyle`
   wrapper.

5. **Restore preview** using `defineLive({ client, serverToken, browserToken })` from
   `next-sanity/live`, `defineEnableDraftMode` from `next-sanity/draft-mode`, and
   `VisualEditing`. Verified against the `next-sanity@13.3.1` export map: there is no
   `./preview` subpath, so `useLiveQuery` and `LiveQueryProvider` have no direct replacement —
   this is a rewrite, not a rename. The token is supplied server-side only.

6. **Sanity TypeGen.** `sanity schema extract` + `sanity typegen generate`, with `sanity.types.ts`
   committed and a CI step asserting it is current. This cannot move to 1A — TypeGen does not
   exist in Sanity 3.14.

Also in 1B: `ScrollUp` deleted (§1.3), and `next lint` is removed in Next 16, so the `lint`
script and CI move to the ESLint CLI with flat config (`eslint.config.mjs`).

**SEO re-verification is its own task, not a side effect.** Phase 0's canonical/OG/noindex work
currently derives the path at runtime from `useRouter().asPath` (`SiteMeta.tsx`). In the App
Router it becomes build-time `generateMetadata` with `metadataBase` and `alternates.canonical`,
and `isNoindexPath` has to be rewired into `robots: { index: false }`. The task verifies
behaviour — canonical and OG tags on every route, `noindex` present on `/tutorial`, `/tutorial`
absent from the sitemap — against a running `next start`, not merely that it compiles. The
noindex/sitemap coupling documented in `lib/site.ts` must survive as a coupling.

**Exit criteria.** `pages/` gone; all routes served from `app/`; typecheck, lint and build green
on the target versions; draft mode works and no read token appears in any client payload;
canonical/OG/noindex behaviour matches Phase 0's; `sanity.types.ts` committed and current.

## 5. Sub-phase 1C — Tailwind 4

Small, isolated, and visual — kept separate so a styling regression cannot hide inside 1B's
diff.

`tailwindcss` 4.3 with `@tailwindcss/postcss`; `@tailwind` directives in `styles/index.css`
become `@import "tailwindcss"` plus an `@theme` block carrying the pinned values from §2.1;
`tailwind.config.js` and `@sanity/demo` are deleted.

**Verification is a before/after diff of the compiled CSS** for the utilities actually in use —
the migration is correct precisely when that diff is empty.

---

## 6. Verification approach

No test framework exists until Phase 2, so every check is a concrete reproducible command, as in
Phase 0 and the parent spec's Appendix A: `tsc --noEmit`, `next lint`, `next build`,
`next start` + `curl`, `grep` against build output, and live Sanity queries.

CI (`.github/workflows/ci.yml`) evolves with the phases: the `lint` invocation changes in 1B
(flat config), and a TypeGen freshness check is added. Whether a `SANITY_API_READ_TOKEN` secret
becomes necessary is determined empirically during 1B — the published perspective needs no
token, so the expectation is that it does not, and that expectation is tested rather than
assumed.

Each sub-phase ends with a **whole-branch review before merge**. In Phase 0 that review caught
two cross-task bugs that no individual task's own review found. 1B touches every route at once,
so cross-route defects are more likely here, not less.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Preview rewrite is the least-charted work; no direct API equivalent exists | Sequenced last in 1B, after routes are stable. Step 1 removes the old system cleanly rather than porting it incrementally. |
| Three major bumps at once make failure attribution hard | 1A removes 17 packages first, shrinking the surface. 1B's step 1 gets the *old* router green on the *new* versions before any routing changes. |
| App Router metadata silently loses Phase 0's SEO work | Dedicated verification task asserting behaviour against a running server, not compilation. |
| Sanity 6 is 2 months old | All three Studio plugins already require `^5 \|\| ^6`; staying on 4 is the higher-risk position. |
| Tailwind palette shift | Values pinned to measured hexes; verified by empty compiled-CSS diff. |

## 8. Phase 1 exit criteria

- Next 16 / React 19 / Sanity 6 / next-sanity 13 / Tailwind 4, all peers satisfied.
- All routes served from `app/`; `pages/` removed.
- No Sanity read token in any client-visible payload.
- `strict: true`, typed GROQ via TypeGen, `publicationsQuery` explicit.
- `npm audit` and Dependabot counts recorded before and after (§1.6).
- Canonical, OG and `noindex` behaviour verifiably unchanged from Phase 0.
- CI green on every sub-phase PR and on `main` after each merge.
