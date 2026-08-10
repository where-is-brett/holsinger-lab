# Phase 2 — Foundations: Correctness, Accessibility, SEO

**Date:** 2026-08-10
**Status:** Approved; ready for planning
**Parent spec:** [`2026-08-07-site-modernisation-design.md`](2026-08-07-site-modernisation-design.md) §Phase 2 "Correctness, accessibility, SEO"
**Baseline:** `main` @ `683aba5` (Phase 1A/1B/1C merged via PRs #1-#4, CI green)

This document re-verifies the parent spec's Phase 2 section against the current codebase — every
file path and line number the parent spec cites was written against the pre-Phase-0 Pages Router
codebase, and Phase 1 (App Router migration, `next/font`, `next-sanity/live`, Sanity TypeGen)
changed nearly everything underneath it. It also resolves the two items carried forward from prior
phases (the type contradiction and the two manual post-deploy checks) and the sub-phase split for
planning. It supplements §Phase 2 rather than replacing it; where the two disagree, this document
is current.

---

## 1. Corrections to the parent spec, item by item

### 1.1 Item 1 — server-rendered navigation

**Still open, unchanged in substance, line numbers shifted.**

`components/global/Navbar/Navbar.tsx` (75 lines, `'use client'`) still gates the entire nav behind
`isBrowser` (line 22, only becomes `true` inside `useEffect` at line 29 — `false` during SSR/SSG)
and picks mobile vs. desktop from `window.innerWidth < 768` (line 32) rather than a CSS breakpoint.
The render gate is `{isBrowser && (...)}` at line 51. Neither `DesktopNavBar.tsx` nor
`MobileNavBar.tsx` has any independent breakpoint logic — both are pure presentational components
entirely dependent on the parent's JS gate. No `md:hidden`/`hidden md:flex`-style responsive
classes exist anywhere in the Navbar tree.

One thing worth noting for the plan: the Phase 1B migration **consciously preserved** this defect
rather than accidentally reintroducing it — line 28 carries
`// eslint-disable-next-line react-hooks/set-state-in-effect -- defers nav rendering until after
mount to avoid SSR/hydration mismatch on window.innerWidth; pre-existing pattern, out of scope to
redesign here`. This is a known, deliberately-deferred item, not a regression.

`components/global/Navbar/MobileNavBar.tsx:29-38` still has the `preventDefault()` +
`setTimeout(..., 500)` pattern (old citation was `20-29`):

```ts
const handleLinkClick = (e, href) => {
  e.preventDefault()        // line 33
  handleMenuClick()
  setTimeout(() => {        // line 35
    router.push(href)
  }, 500)                   // line 37
}
```

**New findings beyond the parent spec's scope, all confirmed absent:** the mobile menu has no
`aria-expanded` (zero hits anywhere in `components/`), no Escape-to-close, no scroll lock, and no
focus trap. `@headlessui/react` (`2.2.10`) is already a dependency but only its bare `Transition` is
used (`MobileNavBar.tsx:76-141`) — not `Dialog`, which would provide focus-trapping and
`aria-*` wiring for free. The hamburger `<button>` (`MobileNavBar.tsx:53-58`) has
`aria-label="button"` — present, but semantically empty; it should say "Open menu" / "Close menu"
and toggle. The panel itself is an animated `<div>` (headless-ui `Transition as="div"`), not a
`<dialog>` or `Dialog`.

**`PreviewNavbar.tsx` (the parent spec's other Navbar complaint) is resolved, structurally.** It was
deleted outright in the Phase 1B migration commit (`281e365`) along with the old preview system.
`components/preview/PreviewBanner.tsx` (27 lines) is its replacement, but it is not a navbar at
all — a standalone banner rendered independently at the root layout (`app/layout.tsx:110`) only
when draft mode is on. There is now exactly one `Navbar` render path
(`components/shared/Layout.tsx:19-31`), passed the full `showPublications`/`showPeople`/
`showContactForm` prop set unconditionally. The specific defect the spec named — preview nav
dropping toggle props and diverging from production — is now structurally impossible, since there's
no second code path to diverge. **Drop this from the Phase 2 work list.**

### 1.2 Item 2 — `<a onClick>` → `<button>`, `<ul>` markup, heading hierarchy

**`<a onClick>` without `href`: still open, exhaustively confirmed to be exactly two instances.**

- `components/pages/publications/Toggle.tsx:19` (old citation: line 7)
- `components/pages/people/Profile.tsx:88` (old citation: line 53)

A full-tree grep of every `<a` tag in `components/` and `app/` found only 5 anchor sites total; the
other 3 all have `href` (`Profile.tsx:101` `mailto:`, `Profile.tsx:109` `tel:`,
`Publication.tsx:40-47`, `CustomPortableText.tsx:77-84`, `PreviewBanner.tsx:18-23`). No new
instances were introduced during the migration.

**`<ul>`/`<div>` markup: still open, same defect, shifted line.**
`components/pages/publications/Publications.tsx:19` — `<div key={publication._id}>` is a direct
child of the `<ul>` at line 14 (old citation: line 15). Confirmed via full-tree grep this is the
*only* `<ul>`/`<ol>` markup defect in the codebase; `CustomPortableText.tsx`'s `<ul>`/`<ol>`
renderers (lines 90, 97) rely on `@portabletext/react`'s default `listItem` handling and are fine.

**Heading hierarchy — the parent spec's headline claim is now *fixed*, not open.**
The parent spec's §4.4 claims `components/shared/Header.tsx` renders the lab name as a `<div>`
while "Our Research Projects" is an `<h1>`. That was fixed in commit `7406b5b`
("fix: correct heading hierarchy — page title is h1, not a div"), which predates even the App
Router migration and is the same day as the spec itself — the spec is internally inconsistent (its
own §5.0.3 work-item list already prescribes this fix as a Phase 0 item). Current state:
`Header.tsx:21` renders `<h1>`; `HomePage.tsx:24` renders `<h2>` for "Our Research Projects." Mark
this sub-item **complete**, not part of Phase 2's remaining scope.

That said, a **full heading-hierarchy pass** (as the parent spec's Phase 2 item 2 literally asks
for) surfaces three things worth fixing that the parent spec never named, found during this
re-verification:

- `components/pages/home/ProjectListItem.tsx:46` renders each showcase-project title as a plain
  `<div className="text-xl font-extrabold...">`, not a heading — a gap in the homepage's outline.
- `components/pages/publications/Publication.tsx:55` uses `<h4>` for a journal/date + Abstract/
  Citation-toggle controls row — metadata and interactive controls, not subordinate content.
  Semantically questionable; likely should not be a heading at all.
- `Publications.tsx:21`'s year separators render as `<li>` text, not headings — arguably should be
  `<h2>` for a11y navigation within the list, though this is a new observation, not a regression.

Full per-route heading inventory (for the plan's reference, not reproduced in full here — verified
against every `<h1>`–`<h6>` in `app/` + `components/`): Home is `h1 → h2`, clean. Publications is
`h1 → h2 (per item) → h3 (authors) → h4 (metadata row, questionable)`. People is `h1 → h2 (per
card)`, clean. Contact is a single `h1`. Generic Sanity pages (`/[slug]`, `/projects/[slug]`) are
`Header`'s `h1` followed by `CustomPortableText`-rendered body content, which already downgrades
authored Sanity `h1` blocks to `<h2>` (`CustomPortableText.tsx:31-37`) so authored content can't
produce a second page `<h1>` — a sound existing safeguard, unrelated to the migration.

### 1.2a New finding: no `<main>` landmark anywhere — found only by running axe, not by grep

Not in the parent spec, and not caught by this document's own §1.1/§1.2 research (which, like the
rest of this re-verification, worked by reading and grepping source). Found instead by actually
building the app (`npm run build && npm run start`) and running `axe-core@4.12.1` in a real browser
against `/`, `/publications`, `/people`, and `/contact` — worth calling out explicitly, since it is
exactly the kind of gap the Phase 1C retrospective's lesson warns about: a verification method is
blind to whatever it doesn't look at, and source-reading/grepping doesn't "see" the accessibility
tree the way a real browser + axe does.

Every route produces two identical violations: `landmark-one-main` (moderate — "Document should
have one main landmark") and `region` (moderate — "All page content should be contained by
landmarks"). Root cause: `components/shared/Layout.tsx:33-37` wraps all page content in a plain
`<div className="mt-32 flex-grow ...">`, not a `<main>` element — every route in the app shares this
one `Layout` component, so the gap is site-wide, not per-page. `/publications` additionally confirms
(empirically, not just by static analysis) that the `<div>`-in-`<ul>` defect from §1.2 is a real,
axe-detectable `serious`-impact violation: `list` ("`<ul>`/`<ol>` must only directly contain `<li>`,
`<script>` or `<template>` elements", 1 node) and `listitem` ("`<li>` elements must be contained in
a `<ul>` or `<ol>`", 25 nodes — one pair per publication, confirming this isn't a one-off).

The fix is small (change the `Layout.tsx:33` wrapper to a `<main>` element, or add `role="main"`)
and belongs with the rest of the markup/landmark work in Phase 2's accessibility sub-phase (§4,
2C) — it touches the same file (`Layout.tsx`) that the server-rendered-nav work already opens.

### 1.3 Item 3 — image pipeline

**The fraction-vs-pixel hotspot bug is still open, at the same file:line the spec cited — and now
has a second, independently-introduced occurrence.**

`components/shared/ImageBox.tsx:22` still chains `.height(height).width(width)` straight from
component props into the Sanity URL builder, with defaults `width = 3500, height = 2000`
(lines 16-17). `components/pages/home/ProjectListItem.tsx:26` (old citation matches) still calls it
with `width={project.coverImage?.hotspot?.width}` / `height={...hotspot?.height}` — hotspot
fractions (0–1, per `schemas/documents/project.ts`, `hotspot: true`) fed into a pixel-dimension
slot. When no hotspot is set (today's case for all content), `undefined` falls back to the
3500×2000 default, reproducing the spec's cited upscale of a 1222×596 source.

**New: a second, structurally distinct instance of the same root-cause bug**, introduced by the
Phase 1 migration's `ImageContainer` component (portable-text inline images — this component and
its call site didn't exist in the pre-migration codebase the parent spec audited).
`components/shared/CustomPortableText.tsx:116-117` passes `value.hotspot?.width` /
`value.hotspot?.height` into `components/shared/ImageContainer.tsx:17-18`'s `width`/`height`
props (defaults `0`, not `3500`/`2000`) — but `ImageContainer.tsx:22`'s URL builder call never
chains `.width()/.height()` at all, so the *fetched* asset is unconstrained full-size while the
fraction (or `0`) is passed straight to `next/image`'s own `width`/`height` layout props instead.
With no hotspot set, every embedded portable-text image today renders with `width={0} height={0}`.
Both call sites share one root cause and should share one fix: **caller code should never read
`.hotspot.width`/`.hotspot.height` as a pixel size** — `@sanity/image-url`'s builder already applies
the stored hotspot as an internal focal point once `.width()`/`.height()`/`.fit('crop')` are set to
an intended *output* size, so the fix is to stop threading hotspot fractions through props entirely,
not to convert them.

`lib/sanity.image.ts`'s `urlForImage` (17 lines) is otherwise a thin, correct builder
(`.auto('format').fit('max')`) with no bug of its own — the divergence exists because 3 call sites
(`ImageBox`, `ImageContainer`, `lib/metadata.ts:27-28`) each reimplement the
`.width()/.height()/.fit('crop')` chain independently rather than sharing one helper, which is how
the bug diverged into two shapes.

**`sizes` is never derived from actual layout.** Every Sanity-backed `next/image` usage
(`ImageBox.tsx:27-34`, `ImageContainer.tsx:27-34`) passes a hardcoded `sizes` string defaulting to
`'100vw'`; the only override anywhere is `TimelineItem.tsx:28` (`'10vw'`). `Profile.tsx` (renders in
a 3-column grid) and `ProjectListItem.tsx` (`md:w-7/12`) both leave it at `100vw`, over-fetching
resolution. **No `placeholder="blur"`/`blurDataURL` exists anywhere** in the codebase — confirmed by
grep, zero hits. **No fallback avatar exists for image-less profiles** — `Profile.tsx:55-62` has no
conditional for `!profile.image`; when absent, `ImageBox`'s `{imageUrl && (<Image .../>)}` (line 27)
renders nothing, leaving only the wrapping `bg-gray-50` `<div>` — the "blank grey box" the spec
described, unchanged.

Also worth flagging for the plan (not in the parent spec, found during this pass):
`ImageBox.tsx:28` uses `className="absolute h-full w-full"` rather than `next/image`'s `fill` prop,
while still passing explicit `width`/`height` — a fragile pattern for "explicit aspect ratios"
(the parent spec's own stated goal for this item) since the CSS-stretched box and the intrinsic
`width`/`height` attributes can silently disagree, and it depends on every caller correctly
supplying a `relative`-positioned `classesWrapper`.

Full inventory of Sanity-backed image call sites for the plan's task-sizing: `ImageBox` (core,
buggy), `ImageContainer` (core, buggy — second shape), `ProjectListItem` (buggy caller),
`ProjectPage.tsx:36-39` (no width/height passed at all → always the 3500×2000 default regardless of
source size), `Profile.tsx:56-62` (fixed 800×800, no hotspot use, missing-image fallback gap),
`TimelineItem.tsx:25-31` (fixed 65×65, safe), `lib/metadata.ts:27-28` (fixed OG/Twitter dimensions,
not hotspot-derived, safe).

### 1.4 Item 4 — `internalLink` renderer; consistent `target`/`rel`

**Renderer: still missing, confirmed.** `components/shared/CustomPortableText.tsx`'s `marks` object
(lines 74-86) defines exactly one mark component, `link` (a URL-annotation renderer). There is no
`internalLink` entry, so any `internalLink` annotation renders as unstyled, unlinked plain text —
`PortableText`'s default behavior for a mark with no matching component.

**Schema location has moved and is narrower than the parent spec implied.** The old spec cited
`schemas/documents/page.ts:91` as a general-purpose annotation; it is now defined at
`schemas/documents/page.ts:96-108`, scoped **only** to the `page` document's own `body` field, and
its `reference` field only targets other `page` documents (`to: [{ type: 'page' }]`) — not
`project`, `home`, or anything else. It is not present on `home`'s `overview` field or `settings`'s
`footer` field (those define only the URL `link` annotation). This means the renderer's scope is
inherently `page`-to-`page` links only, unless the schema itself is widened — a decision this
document resolves in §3.1 below.

**A second gap the parent spec didn't name: the query never expands the reference.**
`pagesBySlugQuery` (`lib/sanity.queries.ts:24-32`) selects `body` raw, without expanding
`markDefs[].reference->{slug, title}`. Adding the renderer alone is not sufficient — the query needs
to resolve the target page's slug (and ideally title, for the link text) before a renderer can build
an `href`.

**`target`/`rel`: the parent spec's framing doesn't quite apply anymore.** The current `link` mark
(`CustomPortableText.tsx:77-84`) sets `rel="noreferrer noopener"` but has **no `target` attribute at
all** — every portable-text link, external or otherwise, opens in the same tab today. There's
nothing inconsistent to reconcile (no `target="_blank"` exists to pair correctly or incorrectly with
`rel`); the actual decision is whether external links should open in a new tab in the first place,
which is new scope, not a fix to existing inconsistency.

### 1.5 Item 5 — JSON-LD (`Organization`, `Person`, `ScholarlyArticle`)

**Confirmed: zero JSON-LD/structured-data implementation exists anywhere** (grepped for
`ld+json`/`schema.org`/`JsonLd`/`StructuredData` across `app/`, `components/`, `lib/` — no hits).

`Organization` for the lab is straightforward — static/settings-derived data, natural home is
`app/layout.tsx`. `Person`-per-profile and `ScholarlyArticle`-per-publication are **blocked by
routing and schema gaps that didn't exist when the parent spec was written**, because at that time
this was still a Pages Router app without the current route inventory settled:

- Neither `people` nor `publications` has a detail route — `app/people/page.tsx` and
  `app/publications/page.tsx` are list-only. By contrast `app/projects/[slug]/page.tsx` does exist.
  Neither the `profile` nor `publication` schema (`schemas/documents/profile.ts`,
  `schemas/documents/publication.ts`) has a `slug` field at all, so there is currently no
  addressable identifier to build a `[slug]` route from without a schema change.
- `PublicationPayload.author` (`types/index.ts:74`; schema `schemas/documents/publication.ts:16-21`)
  is a single required free-text `string`, not a structured author list — per-author `Person`
  linking for `ScholarlyArticle.author` isn't directly possible without parsing prose.
- `publication.url` (schema description: "Enter the full DOI / URL of the journal") conflates DOI
  and URL into one free-text field — there's no dedicated `doi` field to emit
  `ScholarlyArticle.identifier` cleanly.
- `ProfilePayload` (`types/index.ts:84-93`) has no `affiliation`/`institution`/`url`/ORCID field;
  `role` is the closest analog to a job title.

This is a genuine open decision for the plan, resolved in §3.2 below — not a simple "add the
missing renderer" task like items 2 and 4.

### 1.6 Item 6 — preview parity across all document types

**Better than the parent spec implied at the data-fetching layer; worse than implied at the
entry-point layer — a nuance the parent spec, written pre-migration, had no way to characterize.**

All 6 document types (`home`, `page`, `project`, `publication`, `profile`, `settings`) are fetched
via `sanityFetch` (from `next-sanity/live`, `lib/sanity.live.ts:1-18`) in every content-rendering
route (`app/page.tsx:25`, `app/[slug]/page.tsx:31`, `app/projects/[slug]/page.tsx:32-35`,
`app/publications/page.tsx:32`, `app/people/page.tsx:31`, and `settings` in all of the above plus
`app/contact/page.tsx:22`) — i.e., the data layer is uniformly live-preview-capable already. The one
exception is `app/not-found.tsx:13-18`, which uses a plain `getClient().fetch()` (published
perspective only) rather than `sanityFetch`, so the 404 page won't reflect draft-mode changes; low
stakes, but worth a one-line fix while this area is being touched.

**The real gap is upstream, in Studio/routing config, not in the Next.js fetch layer:**
`sanity.config.ts:21-25` defines `PREVIEWABLE_DOCUMENT_TYPES = [home, page, project]` — only 3 of 6
types. `lib/sanity.links.ts`'s `resolveHref` (16 lines) only has cases for `'home'`, `'page'`,
`'project'`; anything else hits `default:` and returns `undefined`. `app/api/draft/route.ts:36-46`
then 400s ("Unable to resolve preview URL") if `resolveHref` returns `undefined` — so there is
currently no way to enter draft mode for `publication`, `profile`, or `settings` documents at all,
from Studio's "Open Preview" button (`plugins/productionUrl/index.ts:44-49`, gated on the same
`PREVIEWABLE_DOCUMENT_TYPES` set) or by hand-crafting a draft URL.

This is partly explained by, and coupled to, §1.5's finding: `publication` and `profile` have no
slug and no per-item route to preview into anyway — only their list pages (`/publications`,
`/people`) exist, and neither is wired into `PREVIEWABLE_DOCUMENT_TYPES`/`resolveHref` even as a
list-level preview target. `settings` is a singleton with no route of its own at all (it's fetched
alongside every page) — "preview" for it would mean something different (e.g. a live-diff panel in
Studio) than the redirect-to-a-route model the other 5 types use.

**Recommendation for the plan (resolved in §3.1):** wire `settings` into the preview-entry path
first — it's a singleton, has no slug problem, and previewing "what does the whole site look like
with this settings change" is achievable today by redirecting to `/`. Treat `publication`/`profile`
list-level preview as coupled to, and sequenced after, whatever the plan decides for JSON-LD's
slug/route question in §3.2 — don't solve the same "these two types have no detail route" problem
twice in one phase.

### 1.7 Item 7 — introduce a test framework

**No test framework, no test files, no `test` script exist anywhere in the repo** (confirmed via
`find` for `*.test.ts(x)`/`*.spec.ts(x)`/`__tests__`, and reading `package.json` in full — no Jest,
Vitest, Playwright, or Testing Library in any dependency list). This item is pure greenfield, not a
re-verification against stale claims — the parent spec is accurate as written.

**Vitest candidates** (pure or near-pure logic), confirmed by reading each file in full:

| Function | File:line | Purity |
|---|---|---|
| `resolveHref` | `lib/sanity.links.ts:1-16` | Pure — deterministic switch, only side effect is a `console.warn` on the default branch |
| `isNoindexPath` | `lib/site.ts:26-28` | Pure — depends only on the module-level `noindexPaths` Set and the (currently unexported) `normalizePath` helper (`lib/site.ts:19-24`, also pure) |
| `buildMetadata` | `lib/metadata.ts:6-53` | Mostly pure — pure when `image` is omitted; calls `urlForImage` (needs a mock) when `image` is passed |
| `urlForImage` | `lib/sanity.image.ts:10-16` | Partially pure — deterministic logic, but closes over a module-scoped `imageBuilder` constructed from env vars at import time |
| `getAllPaths` | `lib/paths.ts:5-16` | Not pure — live Sanity fetch via `getClient()`; needs the client mocked |

**Two candidates need extraction before they're unit-testable**, worth flagging as a small
prerequisite rather than skipping them: `Publication.tsx`'s citation-string assembly and date
formatting (lines 27-33, 82-94) and `Publications.tsx`'s year-grouping logic (lines 16-17) are both
inline in JSX/component bodies, not exported functions. Extracting `formatCitation`/
`formatPublicationDate`/`groupByYear` as standalone functions is a natural fit for whichever task
touches these files for the `<ul>`/heading-hierarchy fixes anyway (§1.2).

**Playwright route inventory:** 6 navigable content routes (`/`, `/contact`, `/people`,
`/publications`, `/[slug]`, `/projects/[slug]`), one `/studio` (no server-side Sanity dependency —
Studio fetches client-side after mount), and 4 non-navigable API routes better suited to Playwright's
`request` fixture than page navigation. Three of the six content routes
(`/contact`, `/people`, `/publications`) can legitimately 404 depending on Sanity `settings` toggles
(`app/contact/page.tsx:45`, `app/people/page.tsx:56`, `app/publications/page.tsx:57`) — smoke tests
need to assert against the live toggle state, not assume 200 unconditionally.

**No `engines` field or `.nvmrc` exists** — the only Node pin is CI's `node-version: 22`
(`.github/workflows/ci.yml:22`). Both Vitest 3.x and Playwright are satisfied by Node 22, but adding
an `engines` field while touching `package.json` for the new dependencies costs nothing and closes a
reproducibility gap.

---

## 2. Carried-forward items, resolved

### 2.1 `sanity.types.ts` vs. `types/index.ts`

**Confirmed and scoped precisely.** `sanity.types.ts` is generated and committed (CI enforces
freshness via `git diff --exit-code sanity.types.ts` after `npm run typegen`,
`.github/workflows/ci.yml:33-39`) but **is not imported anywhere in the codebase** — `app/`,
`components/`, and `lib/` exclusively import from `types/index.ts`. TypeGen output exists but is
wired to nothing; Phase 1 item 6 produced the file without consuming it.

Real divergences found, by payload type (hand-written type at `types/index.ts`, generated type
derived from the actual GROQ query in `sanity.types.ts`):

- **`PublicationPayload`** (`types/index.ts:71-82`) vs. `PublicationsQueryResult`
  (`sanity.types.ts:755-766`): `title`, `author`, `journal`, `date` are hand-typed as required
  non-null `string`; TypeGen (correctly, per the schema) says `string | null`. This is the exact
  example named in the task brief, confirmed live in `app/publications/page.tsx:35`.
- **`ProfilePayload`** (`types/index.ts:84-93`) vs. `ProfileQueryResult`
  (`sanity.types.ts:771-786`): same shape of divergence on `orderRank`, `name`, `role`.
- **`ProjectPayload`** (`types/index.ts:47-60`) vs. `ProjectBySlugQueryResult`
  (`sanity.types.ts:627-689`): **`slug: string` (required) vs. generated `slug: string | null`** —
  the highest-stakes divergence, since `app/projects/[slug]/page.tsx`'s `generateStaticParams`
  (lines 47-51) and `notFound()` guard (lines 82-84) both implicitly trust a valid non-null string
  slug. Also missing `_id` entirely (present in the generated type).
- **`PagePayload`** (`types/index.ts:39-45`) has a **phantom `name?: string` field** — it exists in
  neither the `page` schema (`schemas/documents/page.ts`, which only defines `title`, `slug`,
  `overview`, `body`) nor `pagesBySlugQuery`'s selection. It can never be populated; dead type
  surface.
- **`HomePagePayload.footer?: PortableTextBlock[]`** (`types/index.ts:33`) claims an array of
  portable-text blocks; TypeGen infers `footer: null` literally (`sanity.types.ts:506`), because
  `homePageQuery` selects `footer` on the `home` document but the `Home` schema type
  (`sanity.types.ts:317-347`) has no `footer` field at all. Any code path reading `page.footer` as
  blocks is working with data that is *always* `null` at runtime, not just possibly-absent.
- **`SettingsPayload.menuItems`** (`types/index.ts:64`, using the hand-written `MenuItem` at
  `types/index.ts:4-8`, `{ _type: string; slug?: string; title?: string }`) collapses what TypeGen
  correctly models as a discriminated union (`sanity.types.ts:726-742`) where a `_type: 'home'`
  entry's `slug` is **always `null`**, never a string. The widened hand type lets code treat a home
  menu entry's `slug` as possibly-present, which it structurally never is.

16 `as`-cast sites across the six named files (`app/page.tsx`, `app/[slug]/page.tsx`,
`app/people/page.tsx`, `app/contact/page.tsx`, `app/publications/page.tsx`,
`app/projects/[slug]/page.tsx`) — each file has an explanatory comment attributing the cast to
`sanityFetch`'s `SanityQueries` lookup returning `unknown` (a real, independent reason to cast).
But because the cast target is `types/index.ts`'s interfaces rather than the generated
`*QueryResult` types, each `settings`/entity-data cast *also* silently overrides every divergence
above — a TypeScript `as` cast from `unknown` isn't structurally checked. The `homePageTitle` casts
(one per file, `string | null` on both sides) are clean `unknown`-workarounds that mask nothing.

**Decision:** adopt the TypeGen-generated types as the source of truth for these six files' payload
shapes, per the task brief's framing that they're "more trustworthy." This is not a pure rename —
three of the divergences above are real bugs the generated types expose, not just type-strictness
noise, and Phase 2 should fix them, not just re-type around them:

1. `HomePagePayload.footer` — either the `home` schema is missing a field that should exist, or the
   code reading `footer` should be deleted as dead. Decide by checking whether any content or design
   ever intended a homepage footer distinct from `settings.footer` (which does exist,
   `types/index.ts:63`, and is what `Layout.tsx`/`Footer.tsx` presumably render already — check
   before assuming the fix is "add the field").
2. `PagePayload.name` — delete the phantom field; nothing produces or consumes it correctly.
3. `ProjectPayload.slug` nullability — add an explicit `notFound()`/early-return guard wherever a
   null slug would otherwise flow into a route param or `generateStaticParams`, don't just widen the
   type and let `strict` mode's `string | null` propagate silently.

This work naturally sits alongside the `as`-cast cleanup, since fixing the underlying type also
removes the need for several of the casts (the `unknown`-workaround casts stay; the
divergence-masking casts become unnecessary once the two type definitions agree).

### 2.2 Two unchecked manual post-deploy items

Both remain untestable in this sandboxed environment, exactly as flagged in the Phase 1C plan — no
live deploy or Sanity token access here. **Flagged again, not dropped:**

1. Confirming the Sanity webhook hits `/api/revalidate` with `SANITY_WEBHOOK_SECRET` set in the real
   deployed environment.
2. Confirming `VisualEditing` overlays render against a real draft-mode session with a real Sanity
   token.

**However, `/api/revalidate`'s own auth/validation logic *is* fully testable locally, and Phase 2's
test-framework work should cover it** — this is the concrete, scoped answer to whether Phase 2 can
add automated coverage around the testable parts of item 2. Read in full
(`app/api/revalidate/route.ts`, 68 lines):

- **Auth**: `parseBody` (`next-sanity/webhook`, line 4) checks a `sanity-webhook-signature` header
  against `process.env.SANITY_WEBHOOK_SECRET` (line 11). If the secret is unset, `isValidSignature`
  resolves to `null`; the route's `if (!isValidSignature)` guard (line 13) treats `null` the same as
  an invalid signature — so the route **fails closed** (always 401s) when misconfigured, rather than
  failing open. Good behavior, worth a test asserting it explicitly.
- **The old spec's "page case reports success without succeeding" bug is fixed** — the `'page'`
  branch (lines 22-27) no longer claims to revalidate the homepage; only `'project'` (lines 28-34)
  touches both its own path and `/`, and its message says so accurately.
- **A live version of the same bug class still exists, just relocated and no longer hardcoded**: if
  `type` is `'page'` or `'project'` but `slug` is `undefined` (a malformed webhook payload — line 19
  only guards a missing `body`, not a missing `slug` field within a present body),
  `revalidatePath('/undefined')` runs and the route still returns `success: true`. `revalidatePath`
  is fire-and-forget with no return value, so **every branch's `success: true` only means "no
  exception was thrown," never "the intended content actually changed."**
- **The `default` branch's unbounded-fan-out concern is still live**, now dynamically sized instead
  of the old hardcoded "11+": it calls `getAllPaths()` (`lib/paths.ts:5-16`, 4 static paths + one per
  CMS `page` + one per CMS `project`, fetched live) and `revalidatePath`s every result — scales
  unboundedly with CMS content growth, hit on any unrecognized `type`.
- `SANITY_WEBHOOK_SECRET` is **not documented in `.env.local.example`** (confirmed by reading it in
  full — it lists `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`, `FORMSPREE_ENDPOINT`, etc., but
  not this var), though it is set in the real gitignored `.env.local`. A new engineer copying the
  example file gets a working build and a permanently-401ing webhook, with no pointer to why.

To unit-test this route's logic, four things need mocking: `revalidatePath` (`next/cache`),
`parseBody` (`next-sanity/webhook`, to control `isValidSignature`/`body` without a real HMAC
signature), `getAllPaths` (`lib/paths`, to avoid a live Sanity fetch in the `default`-branch test),
and `process.env.SANITY_WEBHOOK_SECRET` (set/unset per test case). None of this requires live
credentials or a deployed environment — it's exactly the kind of coverage Vitest is suited for, and
it directly narrows (without fully closing) the gap the two flagged manual items leave open: the
route's *logic* gets tested; the *live webhook wiring* still can't be, and stays flagged for a human
to check post-deploy.

---

## 3. Resolved open decisions

### 3.1 `internalLink` and preview-entry scope: keep narrow, don't expand the content model

The `internalLink` schema (`schemas/documents/page.ts:96-108`) only targets `page` documents today.
Widening it to also reference `project`/`home` would be a content-model change — the parent spec's
own non-goals section rules out content-authoring scope creep, and by extension, expanding what
editors can link to is a bigger decision than "add the missing renderer." **Decision: implement the
renderer and the query fix (expand `markDefs[].reference->{slug, title}` in `pagesBySlugQuery`) for
the schema as it exists today — page-to-page links only.** Widening the schema to other document
types is out of Phase 2 scope; note it as a candidate follow-up if the lab asks for it.

Similarly for preview-entry (§1.6): wire `settings` into `PREVIEWABLE_DOCUMENT_TYPES`/`resolveHref`
now (it's a singleton with an obvious preview target, `/`) but treat `publication`/`profile`
preview-entry as blocked on the same slug/route question JSON-LD is blocked on (§3.2) — don't design
two different partial answers to "these types have no detail route" in one phase.

### 3.2 JSON-LD scope: ship what current data supports; don't add schema fields to unblock it

`Organization` (lab-level, `app/layout.tsx`) is unblocked and should ship. Per-entity `Person` and
`ScholarlyArticle` JSON-LD, as literally described in the parent spec, presuppose addressable
detail pages that don't exist (`profile`/`publication` have no `slug` field, no `[slug]` route).
Adding `slug` fields to those schemas would be a content-model change with knock-on effects (new
required-field validation, editor-facing UI, potential redirects) disproportionate to a "correctness
and SEO" phase, and the parent spec's Phase 2 item list never mentions adding schema fields.

**Decision: implement `Organization` on every route (via the root layout), and list-level structured
data on `/people` and `/publications`** — an `ItemList` of `Person`-shaped entries and an `ItemList`
of `ScholarlyArticle`-shaped entries respectively, using the fields that already exist
(`ProfilePayload.name`/`role`/`image`; `PublicationPayload.title`/`author`/`journal`/`date`/`url`).
This is valid, useful structured data today, without inventing addressable per-entity URLs Google
would need `@id`s to point at. Treat true per-entity structured data on dedicated detail pages as
future work gated on a separate decision about whether `people`/`publications` should get their own
routes at all — flag it in the plan's risks/follow-ups, don't silently expand this phase to build
it.

### 3.3 Navbar rewrite: CSS breakpoints, not a second client-side gate

Recommend rendering both `DesktopNavBar` and `MobileNavBar` unconditionally in server-rendered HTML,
toggling visibility with Tailwind responsive display classes (`hidden md:flex` /
`md:hidden`) instead of the current `isBrowser`/`window.innerWidth` state machine. This removes the
hydration-mismatch problem at its root (nothing computed from `window` decides *which* markup exists
in the DOM) rather than working around it, matches the existing component split (no restructuring
needed beyond the gate itself), and confines remaining client JS to what's legitimately
client-only — the mobile panel's open/close *animation* state, not the choice of which nav renders.
`@headlessui/react`'s `Transition` (already a dependency) or `Dialog` (not yet used, but available)
can keep handling that animation.

### 3.4 Mobile menu accessibility contract

Add, as a coherent set rather than piecemeal: `aria-expanded`/`aria-controls` on the hamburger
button (replacing the current empty `aria-label="button"` with real "Open menu"/"Close menu" text
that toggles with state), Escape-to-close via a keydown listener, a focus trap while the panel is
open (either adopt headless-ui's `Dialog`, which provides this natively and is already an installed
dependency, or implement manually), and a body-scroll lock while open. This is the item §5 below
calls out as needing the retrospective's lesson applied most directly.

### 3.5 `sanity.types.ts` adoption

Per §2.1: the six route files' payload casts move to target the generated `*QueryResult` types
(possibly re-exported under friendlier names from a thin wrapper, at the plan's discretion) rather
than `types/index.ts`'s hand-written interfaces, and the three real bugs the divergence exposed
(`footer`, phantom `name`, `slug` nullability) get fixed at the schema/query/guard level, not typed
around.

---

## 4. Sub-phase split

**Decision: four sub-phases, each independently shippable, each its own PR and review** — same
methodology as Phase 1 (fresh implementer subagent per task, task-scoped review, whole-branch review
before merge), applied across more, less-tightly-coupled units of work than Phase 1B's forced
version-bump chain. Phase 2's items don't have Phase 1B's kind of technical coupling (nothing here
requires anything else to land first at the dependency-graph level, unlike React 19 ⟺ Sanity 6 ⟺
App Router), but they cluster naturally by *verification method* — and mixing verification methods
in one PR is exactly what makes a whole-branch review harder, per the Phase 1C retrospective's
lesson about blind spots hiding wherever the reviewer's method doesn't reach.

1. **2A — Test framework foundation.** Vitest + Playwright + `@axe-core/playwright`, CI wiring, and
   a first real batch of tests against the pure functions already inventoried in §1.7
   (`resolveHref`, `isNoindexPath`, `buildMetadata`) plus Playwright smoke tests for the 6 content
   routes. Zero behavioral change to the app; purely additive infrastructure. Goes first because
   `superpowers:test-driven-development` governs how the remaining sub-phases' tasks get
   implemented — they need a harness to write tests *into* before their own implementation code.
2. **2B — Data and content correctness.** `sanity.types.ts` adoption + the three bugs it exposes
   (§2.1/§3.5), `/api/revalidate` hardening + tests (§2.2), the image pipeline's hotspot/crop/`sizes`
   /blur/fallback-avatar fixes (§1.3), the `internalLink` renderer + query fix (§1.4/§3.1). Grouped
   because verification is uniform: `tsc --noEmit`, Vitest unit tests, and live-build/live-query
   checks — the same method Phase 0/1 already used successfully, extended with the new Vitest layer
   from 2A.
3. **2C — Accessibility and interaction.** Server-rendered nav (§1.1/§3.3), `<a onClick>` →
   `<button>`, the `<ul>`/`<div>` fix, the missing `<main>` landmark (§1.2a), the heading-hierarchy
   pass (§1.2), and the mobile menu's accessibility contract (§3.4). Grouped because verification
   here is categorically different from
   2B — keyboard operation, screen-reader semantics, and Playwright+axe assertions, not type-checking
   or build output. This is the sub-phase where the Phase 1C retrospective's lesson applies most
   directly (§5) and benefits from its own focused whole-branch review pass, run after 2A's
   Playwright+axe harness exists to actually exercise it.
4. **2D — SEO (JSON-LD).** `Organization` + list-level `Person`/`ScholarlyArticle` structured data
   (§3.2). Smallest and most independent; sequenced last only because it should build on 2B's
   corrected type shapes (`PublicationPayload`/`ProfilePayload`) rather than the pre-fix hand-written
   ones, to avoid rework.

Settings preview-entry wiring (§3.1's second half) is small enough to fold into 2B (it touches
`sanity.config.ts`/`lib/sanity.links.ts`, adjacent to the type-correctness work already planned
there) rather than warranting its own sub-phase.

---

## 5. Verification approach

Every sub-phase ends with `tsc --noEmit`, `eslint .`, and `npm run build` green, as in every prior
phase — but Phase 2 is the first phase where a passing build is not sufficient evidence of
correctness, because most of its defects are behavioral (interaction, focus, ARIA) rather than
compile-time. The Phase 1C retrospective recorded a specific lesson worth restating here in Phase
2's own terms: **the reference-table method that shipped Phase 1C only checked the surface the plan
author already knew to look for (token names in markup), and missed four regressions living in
config keys, removed utilities, and preflight defaults that had no markup footprint at all.** Phase
2's equivalent blind spot is a plan (or an implementer) that verifies a component against the one
interaction path it was designed for — usually mouse click — and calls it done.

Concretely, per sub-phase:

- **2A**: the harness itself is the deliverable, so its own test is "do the new Vitest/Playwright
  suites produce meaningful pass/fail, not just an empty suite that trivially passes." Verify by
  writing at least one test per new tool that is expected to *fail* against current code before any
  2B/2C fix lands (e.g., an axe assertion against the current mobile menu, a Vitest case for
  `isNoindexPath`'s trailing-slash edge case) and confirming it does fail, before relying on it to
  confirm later fixes.
- **2B**: `tsc --noEmit` becomes meaningful for the first time on the payload-type question, since
  `sanity.types.ts` starts actually being imported. Vitest covers `/api/revalidate`'s auth/branch
  logic per §2.2. The image-pipeline fix should be verified by testing the *contract* — that call
  sites never chain a `.hotspot.width`/`.hotspot.height` value into a pixel-size prop — rather than
  needing a live-dataset hotspot to be set (no such data exists today, per the parent spec's content
  hygiene notes); this makes the fix verifiable without live-data dependence, and durable against
  future regressions.
- **2C**: apply the retrospective's lesson directly, not just as a reminder. For every interaction
  fix, verify: **keyboard-only operation** (Tab to the hamburger, Enter/Space to open, Tab stays
  trapped inside the open panel, Escape closes and returns focus to the trigger — not just "does the
  panel visually toggle"), **screen-reader semantics** (`aria-expanded` actually flips, a `nav`
  landmark is present, heading order is valid per axe's `heading-order` rule), and **axe against both
  the mobile and desktop render paths** at their respective breakpoints, not only the default
  viewport a developer happens to be testing in. A Playwright assertion that only checks "the menu
  text becomes visible" has exactly the same blind spot as Phase 1C's markup grep — it would pass
  today's broken keyboard trap and Escape handling as easily as a correct one.
- **2D**: verify structurally, not visually — a Vitest test asserting the emitted JSON-LD object is
  valid JSON with the schema.org-required fields present for `Organization`/`Person`/
  `ScholarlyArticle`, plus a Playwright assertion that `<script type="application/ld+json">` exists
  and parses on the relevant routes. External validation (Google's Rich Results Test) needs a live
  deployment and is out of reach here, same as the two carried-forward manual items in §2.2 — note
  it as a post-deploy manual check, don't skip noting it just because it's the third such item.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Interaction/a11y fixes (2C) verified only by "looks right," repeating Phase 1C's blind-spot pattern in a higher-stakes area (behavior, not styling) | §5's explicit keyboard/screen-reader/axe-per-breakpoint checklist, applied per task, not just at whole-branch review time |
| `sanity.types.ts` adoption (2B) surfaces real bugs (`footer`, phantom `name`, `slug` nullability) whose *correct* fix requires a judgment call the type system can't make for you (e.g., is `footer` a missing field or dead code?) | §2.1 flags each explicitly; the implementing task should check actual usage/content before picking a fix, not default to "just add `| null` and move on" |
| JSON-LD scope creep into adding `slug` fields to `profile`/`publication` (an appealing quick unblock, but a content-model change) | §3.2 decision explicitly rules this out for Phase 2; flag as a follow-up candidate instead |
| `/api/revalidate` and preview/draft-mode wiring can't be verified end-to-end without a live deployment and real Sanity token | §2.2 carries both original manual items forward unresolved; 2B adds what automated coverage *is* possible (the route's own auth/branch logic) without claiming to close the live-wiring gap |
| Four sub-phase PRs (vs. Phase 1's three) increase total review overhead | Each is scoped to one verification method, which should make each review *faster* per-PR even if there are more of them — matches the rationale for the split in §4 |

## 7. Phase 2 exit criteria

- Navbar renders server-side from CSS breakpoints; `isBrowser`/`window.innerWidth` gate removed; no
  hydration-deferred nav.
- Mobile menu has `aria-expanded`, Escape-to-close, a focus trap, and scroll lock; verified via
  keyboard-only operation, not visual inspection.
- Zero `<a onClick>` without `href`; `Publications.tsx`'s `<ul>` contains only `<li>` children; a
  full heading-hierarchy pass completed, including the three new gaps found in §1.2; every route has
  a `<main>` landmark (§1.2a). Zero `serious`/`moderate`-impact axe violations on any of the 6
  content routes, at both mobile and desktop breakpoints (verified with real axe runs, not just
  fixed against the specific violations already known at planning time).
- Image pipeline never feeds a hotspot fraction into a pixel-dimension prop, at either of the two
  call-site shapes found in §1.3; `sizes` reflects actual rendered layout; blur placeholders and a
  profile fallback avatar exist.
- `internalLink` renders as a working link for `page`-to-`page` references; `pagesBySlugQuery`
  expands the reference.
- `Organization` JSON-LD ships site-wide; `/people` and `/publications` emit list-level `Person`/
  `ScholarlyArticle` structured data.
- `settings` is wired into preview-entry (`PREVIEWABLE_DOCUMENT_TYPES`/`resolveHref`); the other two
  gaps (`publication`/`profile` per-item preview) are explicitly deferred, not silently dropped.
- `sanity.types.ts` is actually imported and used as the source of truth for the six previously-cast
  route files; the `footer`/phantom-`name`/`slug`-nullability bugs it exposed are fixed, not just
  re-typed around.
- Vitest and Playwright+`@axe-core/playwright` are wired into CI; `/api/revalidate`'s auth/branch
  logic has unit coverage; the two live-deployment-dependent manual items from Phase 1C's PR
  (webhook secret, `VisualEditing` overlay) are still flagged, unresolved, carried to whatever phase
  follows.
- CI green on every sub-phase PR and on `main` after each merge.
