# Phase 3 — Foundations: UX/UI

**Date:** 2026-08-11
**Status:** Approved; ready for planning
**Parent spec:** [`2026-08-07-site-modernisation-design.md`](2026-08-07-site-modernisation-design.md) §Phase 3 "UX/UI"
**Baseline:** `main` @ `98bf756` (Phase 2A/2B/2C/2D merged via PRs #5–#8, CI green)

This document re-verifies the parent spec's Phase 3 section against the current codebase and — for
the first time in this programme — against the **live production dataset**. Phase 3 differs from
Phases 0–2 in kind: those items were defects, verifiable by reading code. Phase 3's items are
features, and a feature's feasibility depends on what the *data* supports, not just what the code
does. Several of the parent spec's Phase 3 items turn out to be blocked, mis-shaped, or not worth
building once you look at the 19 publications and 19 profiles they would operate on.

It also resolves all three of the parent spec's §6 open questions (§2), and folds in the two items
Phase 2 explicitly deferred here (§3). It supplements §Phase 3 rather than replacing it; where the
two disagree, this document is current.

---

## 0. The framing change: design quality is now the acceptance criterion

The parent spec's §6 open question #2 asked whether the Wix site supersedes this one, noting the
answer "affects whether Phase 3 is worth its cost." That question is now answered (§2.2), and the
answer changes what Phase 3 *is*.

**Both sites are live.** The Wix site is actively maintained and carries a superset of this site's
sections. The lab's position: this repo is a **valid contender if it is better designed than the
Wix site**, and should be updated on that basis.

So Phase 3 is not a polish pass on a site whose existence is assumed. It is the phase where this
site either earns its place or doesn't. Two consequences run through every decision below:

1. **Design quality is the exit criterion, not a nice-to-have.** The parent spec listed "typography
   and spacing system pass" last, after five feature bullets. It should be **first**. A site with
   publication search and no visual identity loses to a Wix site with neither.
2. **Build what Wix cannot.** Wix gives the lab News, Media, and a Team page cheaply. What it does
   *not* give them is a structured publication list with real citations, filtering, and structured
   data. That is this site's actual comparative advantage and where feature effort should go.

This reframing is why §4.1 recommends leading with the design-token/typography sub-phase rather
than treating it as cleanup at the end.

---

## 1. Corrections to the parent spec, item by item

### 1.1 Publications: search, filters, citations, DOI links, jump navigation

The parent spec bundles five features into one bullet. Verified against the live dataset
(2026-08-11, 19 published `publication` documents, 2020–2025), they have **very different**
feasibility. Taking them in order:

**Per-year jump navigation — mostly already built, small delta.**
Phase 2B introduced `components/pages/publications/groupByYear.ts` (with unit tests), and
`Publications.tsx:18-30` already renders one `<section>` per year with an `<h2>{year}` heading.
6 distinct years (2020–2025). The remaining work is genuinely small: `id` attributes on the year
sections and a sticky jump-nav control. **Downgrade from "feature" to "finish."**

**Copy-citation — an APA-shaped citation already renders; the gap is format quality and copy.**
`Publication.tsx:80-93` already composes `Author (Year). Title. Journal, Volume(Issue), Pages. URL`
behind the "Citation" toggle. What's missing is a copy-to-clipboard control, BibTeX, and correctness
work on the APA output. Citation source data is nearly complete: `pages` 19/19, `volume` 18/19,
`issue` 17/19, `abstract` 19/19. **Viable and high-value.**

Two defects to fix while in here:
- BibTeX needs an entry type and a cite key. The `publication` schema has **no type field** — every
  entry would be `@article`. For a corpus that is 19/19 journal articles this is correct today, but
  it is an assumption to state, not to hide.
- `Publication.tsx:76` and `:95` carry **swapped comments** — the `{/* Abstract */}` comment sits
  above the citation block and vice versa. Behaviour is correct (`show={showCitation}` wraps the
  citation); only the comments mislead. Trivial, but it is in the file the plan will open anyway.

**DOI links — blocked for half the corpus, and coupled to the Studio DOI-lookup item.**
There is no `doi` field. There is one `url` field described as "Enter the full DOI / URL of the
journal", and editors have used it both ways:

| URL shape | Count | DOI machine-extractable? |
|---|---|---|
| `https://doi.org/10.xxxx/…` | 9 | Yes |
| `https://onlinelibrary.wiley.com/doi/10.1002/…` | 1 | Yes, from path |
| `https://www.mdpi.com/{issn}/{vol}/{iss}/{page}` | 8 | **No** |
| `https://www.jneuro.com/abstract/….html` | 1 | **No** |

So **10 of 19** have a recoverable DOI. Rendering "DOI: …" for those and nothing for the other 9
produces a visibly inconsistent list — worse than the current uniform "link the title" behaviour.

**This is the same problem the parent spec's *Studio* item "DOI lookup → autofill" solves.** The two
bullets sit in different halves of the parent spec's Phase 3 list (Readers vs. Admins) and are
never connected, but they are one workstream: the lookup is the mechanism that populates the field
the reader-facing links need. **Sequence them together, admin side first.** See §1.9.

**Filter by year — viable. Filter by journal and by author — recommend dropping.**

- *Journal:* **16 distinct journals across 19 publications.** A filter whose option list is nearly
  as long as the result list is not a filter. (Most common: Pharmaceuticals ×3, Int. J. Molecular
  Sciences ×2; the other 14 appear once each.)
- *Author:* `author` is a **single free-text string**, not an array of references. Holsinger appears
  in all 19 — spelled **five different ways**: `Holsinger R.M.D.`, `Holsinger, R.M.D.`,
  `Holsinger RMD.`, `Holsinger, RMD.`, `Holsinger, RMD.,`. Separators vary (`, ` vs. ` and `),
  several strings carry leading or trailing whitespace, and one ends in a stray comma. A
  split-and-dedupe author filter would render **five separate Holsinger entries**. Making this work
  means either a normalisation layer nobody can fully trust or a content-model change to an author
  reference array plus re-entry of all 19 records.

**Recommendation: build search; keep the year filter; drop the journal and author filters.**
A single free-text search over title + author + journal + abstract solves the "find Holsinger"
and "find the MDPI ones" cases without normalising anything, and all 19 records have abstracts to
search. It is less code than the filters and strictly more useful at this corpus size. If the lab
later wants real author faceting, that is a content-model decision (§5, risks), not a UI one.

### 1.2 People: role grouping, real bios, improved cards

**Role grouping — the parent spec's taxonomy does not match the lab.**
The spec proposes grouping by "PI / postdoc / student / alumni". The live dataset (19 profiles):

| Actual composition | Count |
|---|---|
| Research Scientist | 2 |
| PhD Student | 1 |
| Honours / undergraduate / research students | 16 |
| **PI** | **0 — Damian Holsinger has no `profile` document** |
| **Postdoc** | **0** |
| **Alumni** | **0 as profiles** — `/lab-alumni` exists as a separate `page` |

Three of the four proposed groups are empty, and the fourth holds 16 of 19 people. Grouping by that
taxonomy would produce one full bucket and three empty ones.

Worse, `role` is a **free-text string** (`schemas/documents/profile.ts:31-37`, "Short description of
role in lab") and the 19 values are effectively 19 unique strings. "Honours student in biomedical
engineering" alone is written four ways — `Honours Student (BioMedEng)`, `Honours student (Biomed
Eng)`, `Honours Student (Biomedical Engineering)`, and with inconsistent capitalisation of
"Student". One reads `Ungergraduate student` (the typo §5.0.2 of the parent spec noted and left).
Any grouping keyed on this string produces ~19 groups of 1.

**Recommendation: add a separate optional `roleGroup` enum field** (a small, well-bounded schema
addition with a fixed option list) and keep free-text `role` as the display label. Group by
`roleGroup`, fall back to an "Other" bucket when unset. This is the minimum content-model change
that makes grouping possible at all, and it does not require rewriting the 19 display strings.
**The option list must be derived from the lab's actual composition, not the parent spec's guess** —
propose it to the lab during planning rather than hard-coding PI/postdoc/student/alumni.

Two things to settle with the lab at the same time, both content decisions, neither blocking code:
whether Damian gets a `profile` document (he currently only appears via the
`/projects/about-dr-damian-holsinger` page), and whether `/lab-alumni` should become profile
documents or stay a page.

**Real bios — pure content work, and the UI already degrades correctly.**
Confirmed live: **0 of 19 profiles have a `bio`.** But the parent spec's §4.5 claim that "the expand
affordance on every People card is dead UI" is **no longer true** — `Profile.tsx:88` gates the
button on `{profile.bio && …}`, so with no bios the affordance simply doesn't render. This was
fixed during Phase 2. Mark the *defect* closed; the *content gap* remains the lab's to fill, per
the parent spec's own non-goals.

**Improved cards — one real defect, plus a design problem the code can't fix.**

The real defect is image sizing. `ImageBox.tsx:19` defaults `size = '100vw'`, `ImageContainer.tsx`
does the same, and **no call site overrides it** — verified by reading every `<ImageBox>` and
`<ImageContainer>` usage. So every image on the site declares `sizes="100vw"`, including People
cards that render in a 3-column grid at **325 CSS px**. At dpr 2 the browser consequently selects
the **3840w** candidate for a 325px box. Phase 2's exit criteria claimed "`sizes` reflects actual
rendered layout"; for these two components it does not. **Carry this forward as a real Phase 2
gap, not a new feature.**

Related, lower-stakes: `ImageBox`'s `<Image>` has no `object-fit` (computed `fill`). This is
currently masked because `urlForImage(...).width(w).height(h).fit('crop')` pre-crops server-side to
the same ratio — but `ProjectPage.tsx:39-43` passes no `width`/`height` (so defaults 3500×2000 =
1.75:1) into a `classesWrapper` of `aspect-[16/9]` (1.78:1), stretching project covers by ~1.6%.
Imperceptible, but it is a latent trap the moment a call site disagrees more.

The design problem the code cannot fix: the 19 profile photos are visually inconsistent — white,
wood-panel, and grey backgrounds; headshots next to torso shots; several cropped mid-forehead by
the square crop. A card redesign can mitigate (consistent treatment, a subtle frame, a duotone or
grayscale hover) but cannot make heterogeneous source photography look art-directed. Worth stating
in the plan so nobody treats it as a bug to fix in CSS.

### 1.3 Projects: richer detail pages, related publications, project status

**"Project status" and "related publications" both require schema fields that do not exist.**
`schemas/documents/project.ts` has `title`, `slug`, `overview`, `coverImage`, `duration`,
`category`, `site`, `tags`, `description`. There is **no** status field and **no** reference to
`publication`.

`ProjectPage.tsx:44-84` already renders a metadata strip (Duration / Category / Site / Tags), so
"richer detail pages" is less bare than the parent spec implies. Note `ProjectPage.tsx:26` does
`new Date(duration?.start!).getFullYear()` — the non-null assertion is load-bearing on data that is
optional; it yields `NaN` when `duration` is unset and is saved only by the falsy `NaN` check at
line 45. Worth tidying while in the file.

**Recommendation: treat this as the lowest-priority reader item, and scope it to `status` only.**
A `status` enum (`active` / `completed` / `seeking students`) is a cheap, genuinely useful addition
for a lab site — "seeking students" in particular is the kind of thing prospective students look
for and Wix's site does not surface prominently.

**Related publications should be deferred.** Wiring it properly means either an editor-maintained
reference array on `project` (19 publications × 5 projects of manual cross-referencing, on a dataset
where nobody has filled in a single bio) or inferring the relationship from text, which will be
wrong often enough to embarrass. The cost/benefit is poor at this corpus size. Flag as a follow-up.

### 1.4 Dark mode

**The parent spec says "dark mode that actually compiles." It now compiles — and that made things
worse, not better.** This is the one item whose *nature* changed rather than its line numbers.

The original defect was that Tailwind never scanned `pages/`, so `dark:bg-black` never made it into
the CSS. Phase 0 fixed the content globs and Phase 1C migrated to Tailwind 4. The class compiles
now. Verified empirically (`npm run build && npm start`, real browser, `prefers-color-scheme: dark`,
2026-08-11):

| Element | Computed value under `prefers-color-scheme: dark` |
|---|---|
| `<body>` (`app/layout.tsx:111`, `dark:bg-black dark:text-white`) | `rgb(13, 14, 18)` / white — **applies** |
| `Layout.tsx:18` wrapper (`bg-background text-black`, **no** `dark:`) | `rgb(248, 248, 248)` / `rgb(13, 14, 18)` |
| `<h1>` | `rgb(13, 14, 18)` |
| `<footer>` | `rgb(248, 248, 248)` |

`Layout.tsx`'s `min-h-screen` wrapper sits inside `<body>` and covers it entirely, so **the dark
body is painted over on every route**. A screenshot under forced dark mode is pixel-identical to
light mode. Dark mode today is a no-op that survives only in overscroll gutters.

There is exactly **one** `dark:` usage in the entire codebase (`app/layout.tsx:111`). Every other
colour utility — `bg-background`, `text-black`, `bg-gray-*`, `text-gray-*`, `bg-white`, and the
`Footer`/`DesktopNavBar`/`MobileNavBar` surfaces — is unconditioned.

**Recommendation: this is a design-token task, not a `dark:`-variant task.** Adding `dark:` variants
to ~48 scattered class sites is the expensive, fragile way. The cheap, durable way is to define
semantic tokens (`--color-surface`, `--color-text`, `--color-muted`, `--color-border`) in the
existing `@theme` block in `styles/index.css`, redefine them under a dark media query / `[data-theme]`
selector, and repoint components at the semantic names. **This is the same work as §1.5, and it is
why §4.1 makes tokens the first sub-phase.** The current half-state is the worst of the three
options — either dark mode falls out of the token system, or the single `dark:` pair goes and the
site stops claiming support. **Decided (§3a): build it properly, via the token layer.**

### 1.5 Typography and spacing system pass

**The parent spec's characterisation — "the Sanity template with a green/yellow palette
substituted" — is now half-right.** Phase 1C deleted `tailwind.config.js` and `@sanity/demo`, so the
*mechanism* is the lab's own. But it deliberately ported `@sanity/demo`'s palette **values**
verbatim under a zero-rendered-change constraint. The current `@theme` block
(`styles/index.css:3-21`) is still Sanity's greys and blues, plus two lab additions
(`--color-primary: #2d6a4f` green, `--color-background: #f8f8f8`). The yellow is gone. So: lab
mechanism, template values.

This is the item §0 argues should lead the phase. Concretely, what's there now:

- **Type:** three families — Antarctican Mono (`--font-sans`, so *the whole site's body font is a
  monospace*), Ariana Pro, PT Serif, plus IBM Plex Mono for `<code>`. Every heading on the site is
  set in a mono face at large sizes. That is a strong, deliberate-looking choice at 48px and a
  legibility cost in body copy; it is also unusual enough to be the site's identity if committed to
  properly. Worth an explicit decision rather than inheritance.
- **Spacing:** ad-hoc. `Layout.tsx:26` alone carries `mt-32 md:mt-16 md:px-16 lg:px-32` plus a
  `childrenStyles` default of `px-6`, and `People.tsx`/`Publications.tsx` re-add their own `px-4
  md:px-0`. There is no spacing scale, just per-component values that mostly agree.
- **A quantified contrast failure.** This is the `color-contrast` violation Phase 2C explicitly
  deferred here as "a color/design-token decision":

  | Pair | Ratio | WCAG AA (normal text) |
  |---|---|---|
  | `gray-500` `#727892` on `background` `#f8f8f8` — `ProjectListItem.tsx:48` | **4.10** | **FAIL** (needs 4.5) |
  | `gray-600` `#515870` on `#f8f8f8` — `Profile.tsx:85`, nav inactive | 6.64 | PASS |
  | `black` `#0d0e12` on `#f8f8f8` — body | 18.16 | PASS |
  | `blue-600` `#4043e7` on `#f8f8f8` — links | 6.23 | PASS |
  | `primary` `#2d6a4f` on `#f8f8f8` — borders | 6.02 | PASS |

  Only one pair fails, and it fails narrowly. The tactical fix is one class (`text-gray-500` →
  `text-gray-600`). The correct fix is to stop having a `gray-500` that fails on the site's own
  background — i.e. define the token set against the actual background, which is the point of this
  sub-phase.

Also worth fixing here, one line: `styles/index.css:68-70` sets `ol { list-style-type: disc }` —
ordered lists render with bullets. Any numbered list in a Sanity `page` body is currently wrong.

### 1.6 Studio: restructured desk, orderable publications, clearer singletons

**Partly done. "Orderable publications" is probably the wrong ask.**

`plugins/settings.tsx` already builds a custom structure: singletons (`Home`, `Settings`) pinned at
the top, a divider, then default document lists, then an **orderable** People list via
`orderableDocumentListDeskItem` (`profile` is filtered out of the defaults at line 90 so it isn't
listed twice). So "restructured desk" and "orderable" are both already demonstrated patterns in
this repo — the question is only whether to extend them.

`publication` is **not** orderable: it sits in the default list with an `orderings` entry sorting by
`date desc` (`schemas/documents/publication.ts:9-15`). **This is correct behaviour and should
probably stay.** Publications have a canonical chronological order; manual drag-ordering 19 (and
growing) records invites drift and adds an `orderRank` field for no reader-visible benefit — the
reader-facing page groups by year regardless. **Recommend dropping "orderable publications"** unless
the lab specifically asks to feature-pin certain papers, which is a different feature (a `featured`
boolean) with a clearer purpose.

"Clearer singleton editing" is vague in the parent spec and largely satisfied already
(`singletonPlugin` removes the duplicate action and hides singletons from the global "new document"
menu). Treat as done unless the lab names a specific pain point.

### 1.7 Field-level help and validation, especially around the section toggles

**The named example is already fixed; the general item is partly open.**
`schemas/singletons/settings.ts:33-56` — all three toggles now carry explicit descriptions spelling
out the 404 consequence ("Turning this OFF makes /publications return a 404 — the page disappears
from the site entirely, it does not just hide from navigation") and `initialValue: true`. That was
Phase 0 item 1. **Mark the toggle sub-item complete.**

What remains is genuine but small, and mostly surfaced by the data problems above: `role` has no
guidance (hence 19 inconsistent strings), `url` on `publication` conflates DOI and URL (hence the
§1.1 split), and `author` has no format guidance (hence five spellings of one name). **The most
valuable validation work in Phase 3 is the validation that would have prevented §1.1's and §1.2's
data problems** — which makes it a companion to those items, not a standalone sweep.

### 1.8 Preview for every document type

**Advanced by Phase 2, and the residual blocker is unchanged and structural.**
`sanity.config.ts:21-26` now lists **four** types (`home`, `page`, `project`, `settings`) — Phase 2
added `settings` per its §3.1 decision. Still absent: `publication` and `profile`.

The blocker is the one Phase 2 §1.6/§3.2 identified: neither type has a `slug` or a per-item route,
so there is nothing to redirect a preview *to*. This remains true. **It is now decidable, though,
because Phase 3 is the phase that would add detail routes if they're ever going to exist** — and
the §1.1/§1.2 analysis says they probably shouldn't for publications (the list page with search is
the right surface for 19 records) and might for profiles (a bio-bearing person page is worth a URL,
*if* bios ever get written).

**Recommendation: keep deferred, and record the reasoning as a decision rather than a carry.** Do
not add slug fields speculatively. Revisit if and when the lab fills in bios.

### 1.9 DOI lookup → autofill

**The parent spec calls this "likely the largest single quality-of-life win available." That
judgement holds, and §1.1 makes it load-bearing for the reader side too.**

Nothing exists today. The shape: a Studio input component (or document action) on `publication`
that takes a DOI, queries a public metadata API, and populates `title`, `author`, `journal`,
`volume`, `issue`, `pages`, `date`, and `abstract`.

Two things this re-verification adds:

1. **Add a dedicated `doi` field** rather than continuing to overload `url`. This is what unblocks
   §1.1's reader-facing DOI links, gives the lookup an unambiguous input, and lets `url` keep
   meaning "publisher link." Backfilling the 10 recoverable DOIs is mechanical; the other 9 need a
   title-based lookup or manual entry — which the autofill tool itself makes cheap.
2. **The author-format problem (§1.1) is partly solved for free.** Crossref returns structured
   author lists. If autofill writes a consistently formatted `author` string, new records stop
   adding spellings even if the existing 19 aren't normalised.

**Sequence: `doi` field + validation → autofill tool → backfill → reader-facing DOI links.** That
ordering is why §4.1 puts the Studio sub-phase *before* the publications-UX sub-phase, inverting
the parent spec's Readers-then-Admins presentation order.

---

## 2. Parent spec §6 open questions, resolved

### 2.1 Question #1 — `/tutorial` indexing: **closed, deliberately, and tested**

Not merely noted — decided, with the reasoning recorded at the time. Commit `891c576` ("fix: keep
/tutorial out of search results") names the open question explicitly, states it was being resolved
"by omission rather than by choice" and corrects that, and chooses **noindex over gating**: "The
page stays reachable at 200 for anyone with the link — this hides it from search, it does not gate
it."

The implementation deliberately avoids the failure mode where the two halves drift:
`lib/site.ts:14` holds `noindexPaths = new Set(['/tutorial'])` as the single source, consumed by
both `buildMetadata` (emits `noindex`) and `app/sitemap.ts` (omits the path) — with a comment
explaining that advertising a noindex URL in a sitemap sends contradictory signals, "so neither half
works alone." `normalizePath` handles trailing-slash, query, and hash forms. Phase 2A added unit
coverage for all four cases plus the negative (`/tutorial/extra` → `false`).

**No Phase 3 action.** The one live consequence still open is unrelated to indexing: `/tutorial`
carries a `heading-order` axe violation from its authored CMS body (§3).

### 2.2 Question #2 — the Wix site: **live, actively maintained, coexisting**

Verified 2026-08-11. `https://damianholsinger6.wixsite.com/holsinger-lab` serves real content for
the same lab (Laboratory of Molecular Neuroscience and Dementia, Damian Holsinger, University of
Sydney). Footer reads "©2026 by Damian Holsinger". Recent news items include Honours thesis
completions and a "Welcome Dr Johnny Chan" announcement — Johnny Chan is also the most recently
added `profile` in this repo's dataset, so the two are being maintained in parallel.

Section comparison:

| | Wix site | This repo (`holsingerlab.vercel.app`, live, 200) |
|---|---|---|
| Sections | Home, Research, **News**, Publications, **Team**, **Media**, Contact | Home, Publications, People, Contact |

**Resolution (from the lab, 2026-08-11):** the Wix site was built later and has its own limitations.
This repo **should be updated, and is a valid contender if it is better designed than the Wix
site.** Neither supersedes the other today; this site earns its place on design quality.

This is what §0 builds on, and it has three concrete consequences for planning:

- Phase 3 **is** worth its cost, but its success measure is comparative, not absolute.
- The design/token sub-phase leads (§4.1), because that is the axis the decision turns on.
- **Content gap, flagged not scoped:** Wix's News, Research, and Media sections have no counterpart
  here. Building them is a much larger content-model conversation than Phase 3 should absorb, and
  the lab has not filled in a single bio on the content model that already exists — which is the
  more relevant signal about content-authoring capacity. Record it; don't scope it.

### 2.3 Question #3 — Tailwind design tokens: **half-settled; the open half is Phase 3's**

Phase 1C settled the **mechanism** and deferred the **decision**. It deleted `tailwind.config.js`
and `@sanity/demo` and moved to a CSS-first `@theme` block — but explicitly under a *zero
rendered-output change* constraint, porting `@sanity/demo`'s hex values verbatim (its plan's Global
Constraints: "No behavioural change of any kind"). So of the parent spec's two options — "adopt
lab-specific design tokens, or port the existing palette as-is?" — **1C chose "port as-is," for that
phase**, and the underlying question was carried, not answered.

Two later signals point it squarely at Phase 3: Phase 2C deferred its `color-contrast` violation
here as "a color/design-token decision, not a markup/interaction fix" (§1.5 quantifies it at
4.10:1), and the §2.2 answer makes design the deciding axis.

**Resolution: adopt lab-specific tokens, in Phase 3, as sub-phase 3A.** Scope: semantic token layer
(surface / text / muted / border / accent) on top of the existing `@theme` block, a real spacing and
type scale, contrast-verified against the actual background, and dark mode as a consequence of the
token system rather than a parallel set of `dark:` classes (§1.4). This is the closing move on
"the current design is the Sanity template with a palette substituted."

---

## 3. Carried-forward items from Phase 2

| Item | Status entering Phase 3 |
|---|---|
| `color-contrast` on `/` (`ProjectListItem.tsx:48`) | **In scope**, §1.5 — quantified at 4.10:1, resolved by the token work in 3A |
| `heading-order` on `/tutorial` | **Still deferred.** Authored CMS content, not a component bug. Fixing it means editing live content (no write access here) or making `CustomPortableText` enforce sequential heading order programmatically — a distinct, larger change. Keep in `KNOWN_VIOLATIONS`. |
| `sizes="100vw"` on every image | **In scope**, §1.2 — a genuine gap against Phase 2's own exit criterion, not a new feature |
| Webhook secret hits `/api/revalidate` (manual, needs live deploy) | **Still unverified.** Carried since Phase 1C. No Phase 3 item changes this; carry again in the PR description. |
| `VisualEditing` overlays against a real draft session (manual, needs live deploy) | **Still unverified.** Same. |

The two manual items have now been carried across three phases. They need a live deploy and a real
token, which this sandboxed environment does not have. Worth saying plainly in the Phase 3 PR that
they are *blocked on access*, not forgotten — and worth the lab spending ten minutes to close them.

---

## 3a. Decisions taken, 2026-08-11

Four scope questions were put to the lab after this document's research was complete. One was
answered explicitly; the other three were left to this document's recommendation. Recorded here so
the plan has an unambiguous mandate.

| Question | Decision | Source |
|---|---|---|
| Allow the three schema additions (`doi`, `roleGroup`, `status`)? | **Yes — all three, additive only.** Optional fields, no required-field validation, no migration, every consuming feature degrades gracefully when unset. | Answered explicitly. Supersedes the Phase 1/2 "no content-model change" rulings, which were scoped to those phases' correctness/SEO remit. |
| Confirm the four scope cuts (journal + author filters, orderable publications, related publications, per-type detail routes)? | **All four cut**, per §1.1, §1.3, §1.6, §1.8. | Deferred to recommendation. |
| Dark mode — build properly or remove? | **Build properly, via the semantic token layer** (§1.4). It is the same work as §1.5's typography pass, not an additional cost. | Deferred to recommendation. |
| `roleGroup` option list? | **Derive from actual composition**: Lab Head, Research Scientist, PhD Student, Honours Student, Research Student, Undergraduate, Alumni. Ship the field with this list; **confirm with the lab before the backfill**, since it encodes a reading of their org chart that only they can ratify. | Deferred to recommendation. |

The `roleGroup` caveat is the one live dependency on the lab: 3B can build and ship the field and
its tooling on the provisional list, but the backfill of 19 profiles should not be run until the
taxonomy is confirmed. Nothing in 3C blocks on it — the People page must render correctly with
`roleGroup` unset on every profile (§6, risks).

---

## 4. Sub-phase split

**Decision: three sub-phases**, each independently shippable, each its own worktree, PR, and
whole-branch review — same methodology as Phases 1 and 2 (fresh implementer subagent per task,
task-scoped review after each, opus whole-branch review before merge).

Three rather than Phase 2's four because Phase 3's items collapse once the analysis above removes
what isn't worth building (journal/author filters, orderable publications, related publications,
per-type preview) and merges what's secretly one workstream (DOI field ⟺ autofill ⟺ DOI links;
dark mode ⟺ design tokens).

### 4.1 Ordering, and why it inverts the parent spec

| | Sub-phase | Contents | Verification method |
|---|---|---|---|
| **3A** | **Design tokens, typography, dark mode** | Semantic token layer in `@theme`; spacing + type scale; contrast fixes incl. the `gray-500` failure; dark mode via tokens (or removal of the vestigial `dark:` pair); `ol` list-style fix; `sizes` correction | Real-browser computed styles at both colour schemes + both breakpoints; axe re-run; visual diff per route |
| **3B** | **Studio: DOI field, autofill, validation** | `doi` field + validation; DOI-lookup autofill tool; backfill the 10 recoverable DOIs; field-guidance/validation for `role`, `author`; `roleGroup` enum | Studio-driven manual verification; unit tests over the DOI parse/normalise logic |
| **3C** | **Reader features** | Publications search + year filter + jump nav + copy-citation (APA/BibTeX) + DOI links; People role grouping + card redesign; project `status` | Vitest over citation/search/grouping logic; Playwright per route; axe |

**3A leads** because §0/§2.2 make design the axis this site is judged on, because §1.4's dark mode
and §1.5's typography are literally the same task, and because 3C's card and list redesigns should
be built *on* the token system rather than retrofitted to it.

**3B precedes 3C** because §1.1's reader-facing DOI links depend on the `doi` field 3B creates and
backfills, and §1.2's role grouping depends on 3B's `roleGroup` enum. Building 3C first would mean
shipping a publications list that shows DOIs for 10 of 19 records and a People page grouped into
19 groups of one.

This inverts the parent spec's Readers-then-Admins presentation order. That order was
presentational, not a sequencing claim.

### 4.2 Explicitly out of scope

Recorded so they read as decisions, not omissions — all four confirmed in §3a:

- Journal and author filters (§1.1) — dropped; search covers the need at this corpus size.
- Orderable publications (§1.6) — dropped; chronological is canonical.
- Related publications on projects (§1.3) — deferred; poor cost/benefit at 19 × 5.
- `publication`/`profile` detail routes and preview entry (§1.8) — deferred; revisit if bios land.
- Wix's News / Research / Media sections (§2.2) — flagged as a content-model conversation.
- Writing bios and normalising the 19 `role` strings (§1.2) — the lab's content work. 3B makes it
  *possible* and *guided*; it does not do it.

---

## 5. Verification approach

Phase 1C's retrospective lesson — *a verification method is blind to whatever it doesn't look at* —
applies to 3A most sharply, and this document has already been bitten by the inverse: §1.4's dark
mode finding and §1.2's `sizes` finding were **both invisible to source reading and grep**, and
surfaced only by building the site and inspecting computed styles in a real browser. §1.1's and
§1.2's blockers were invisible to the codebase entirely and surfaced only by querying the live
dataset.

So, per sub-phase:

- **3A:** never verify a token change by reading CSS. Build, serve, and read `getComputedStyle` at
  both `prefers-color-scheme` values and both breakpoints, exactly as Phase 1C's Step 6 did.
  Re-run the axe suite and *shrink* `KNOWN_VIOLATIONS` (the `/` `color-contrast` entry must come
  out; `/tutorial`'s `heading-order` stays). Recompute contrast ratios in code, not by eye.
- **3B:** DOI parsing and author normalisation get unit tests over the **real 19 URL strings and
  19 author strings** captured from the dataset, not invented fixtures — the whole point is that
  the real data is messier than anyone would invent.
- **3C:** citation formatting, search matching, and role grouping are pure functions; test them
  directly (the `groupByYear.ts` + `groupByYear.test.ts` pair is the existing pattern to follow).
  Playwright for the interactive surfaces, axe at both breakpoints.
- **Every sub-phase:** `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm test`,
  `npm run test:e2e` green, with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
  NEXT_PUBLIC_SANITY_DATASET=production`.

One addition specific to this phase: **3A should be reviewed visually against the Wix site**, since
§2.2 makes that the actual standard. A reviewer reading a diff of `@theme` values cannot tell
whether the result is better-designed than the incumbent.

## 6. Risks

| Risk | Mitigation |
|---|---|
| "Better designed" is subjective, and 3A's exit criterion depends on it | Split it: the objective half (contrast ratios, a real spacing/type scale, dark mode that actually works, no `KNOWN_VIOLATIONS` regression) is testable and gates the PR. The subjective half gets a side-by-side visual review against the Wix site with the lab, not a reviewer's solo judgement. |
| Schema additions (`doi`, `roleGroup`, project `status`) are content-model changes — exactly what Phases 2 §3.1/§3.2 kept ruling out | The rulings were scoped to *those* phases, whose remit was correctness/SEO. Phase 3's remit is UX, and §1.1/§1.2 show three of its headline items are simply infeasible without them. All three are **additive and optional** — no required-field validation, no migration, no reader-visible breakage when unset. |
| Backfilling 10 DOIs and adding `roleGroup` to 19 profiles is content work landing in a code phase | 3B ships the *tooling and the field*; the backfill is mechanical and can be done by the lab or by a scripted one-off. Do not gate 3C's merge on the dataset being fully populated — every 3C feature must degrade gracefully when the new fields are unset, and that should be tested explicitly. |
| Dark mode via semantic tokens touches every colour utility on the site — large blast radius in one sub-phase | It is precisely the change that is cheap to verify mechanically (computed styles per route, both schemes) and expensive to verify by eye. Lean on §5's computed-style sweep; do not accept "looks right." |
| The lab never writes the bios, leaving People grouping and card work sitting on empty data | §1.2's finding that the bio affordance already degrades correctly means this is safe: the cards work with zero bios today and will work with 19. Do not build anything that *requires* a bio. |
| Search/filter UI on 19 records is over-engineering | §1.1 already cut this to search + year filter for that reason. If the corpus is still ~20 records, prefer client-side filtering of the already-fetched list over any new query infrastructure. |

## 7. Phase 3 exit criteria

- A semantic design-token layer exists in `styles/index.css`, with a real spacing and type scale;
  no component references a raw `gray-*`/`blue-*` token directly for semantic purposes.
- Every foreground/background pair in the token set meets WCAG AA for its text size, verified by
  computed ratio in code. The `/` `color-contrast` entry is **removed** from `KNOWN_VIOLATIONS`;
  `/tutorial`'s `heading-order` remains, still attributed.
- Dark mode works end-to-end, verified by computed styles on every route under
  `prefers-color-scheme: dark`, with no unconditioned light surface painting over it.
- `sizes` reflects actual rendered layout at every `ImageBox`/`ImageContainer` call site; no 325px
  grid cell requests a 3840w candidate.
- `publication` has a `doi` field with validation; the DOI-autofill tool works in Studio; the 10
  machine-recoverable DOIs are backfilled.
- `/publications` has working search, a year filter, per-year jump navigation, and copy-to-clipboard
  citations in APA and BibTeX. DOI links render for records that have a DOI and degrade cleanly for
  those that don't.
- `/people` groups by `roleGroup` with an "Other" fallback, and renders correctly with zero bios and
  zero `roleGroup` values set.
- `project` has a `status` field, surfaced on project pages.
- Vitest covers citation formatting, DOI parsing (against the real 19 URLs), search matching, and
  role grouping. Playwright + axe green on all 6 content routes at both breakpoints.
- CI green on every sub-phase PR and on `main` after each merge.
- The two live-deploy-dependent manual items (webhook secret, `VisualEditing` overlays) are carried
  forward again, explicitly flagged as blocked on access.

---

## Appendix A — Verification commands

```bash
# Build + serve (all dataset values below are public, per .github/workflows/ci.yml)
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run build && npm run start -- -p 3210

# Live dataset queries used throughout §1 (no auth needed — published perspective)
curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
  --data-urlencode 'query=*[_type=="profile"]{name,role,"hasBio":defined(bio)}'
curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
  --data-urlencode 'query=*[_type=="publication"]|order(date desc){url,author,journal,volume,issue,pages}'
```

Dark mode (§1.4) — in a real browser at `prefers-color-scheme: dark`, against a running server:

```js
const layout = document.querySelector('body > div.flex.min-h-screen')
JSON.stringify({
  body: getComputedStyle(document.body).backgroundColor,      // rgb(13, 14, 18)  — dark applies
  layout: getComputedStyle(layout).backgroundColor,           // rgb(248, 248, 248) — and is painted over
})
```

Image sizing (§1.2) — on `/people`, after images settle:

```js
[...document.querySelectorAll('img')].filter(i => /Profile image/.test(i.alt)).slice(0, 3)
  .map(i => ({ css: i.getBoundingClientRect().width, chosen: i.currentSrc.match(/[?&]w=(\d+)/)?.[1] }))
// → 325 CSS px boxes selecting the w=3840 candidate
```

## Appendix B — Live dataset snapshot, 2026-08-11

**19 publications** (2020–2025, 6 distinct years): 16 distinct journals; `abstract` 19/19,
`pages` 19/19, `volume` 18/19, `issue` 17/19; `url` present 19/19 but DOI-recoverable only 10/19.

**19 profiles**: `bio` 0/19; `image` 18/19 (Jiyoo Choi has none); `role` effectively 19 distinct
free-text strings; no PI, postdoc, or alumni records.

**5 projects, 4 pages** (`/lab-alumni`, `/miscellaneous`, `/support-our-research`, `/tutorial`).
