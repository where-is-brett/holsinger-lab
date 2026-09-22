# Phase 3 — layout and site chrome: decisions and state

Every departure from the plan, and why. Companion to `phase-1-decisions.md` and
`phase-2-decisions.md`. Written 2026-09-22. Branch `redesign/phase-3-layout`, off
`redesign/integration`.

## Status

| Phase 3 step                                                    | State                              |
| ----------------------------------------------------------------- | ----------------------------------- |
| 1. Rebuild `Layout` / navbars on `SiteNav` / `MobileHeader` / `SiteFooter` | done — this document |
| 2. Build the five screens (Publications, People, Research, Resources, Home) | open |
| 3. Re-derive the `:root[data-theme='warm']` presets                | **done early** — cherry-picked, see "Step 3, done early" below |
| 4. Retire `project`, migrate `home.showcaseProjects`, redirects   | open |

## The wrap check — measured

On a production build of `redesign/integration`, at 768px:

- **Today's live nav** (`DesktopNavBar`: wordmark + Home / Publications / People /
  Contact) fits on one row — about 630px of content. The Phase 1 worry does not
  reproduce with the CMS's current single menu item.
- **The redesign `SiteNav`, with the design's hardcoded wordmark, does not fit** —
  wordmark "Holsinger Lab — The University of Sydney" plus the IA's six links plus
  padding and gap comes to about 907px, and the wordmark wraps to two lines inside
  the 52px bar.

This is why decision 2 and its amendment exist, and why this step ships an automated
width check — axe and the token guards cannot see a wrap.

`e2e/nav-wrap.spec.ts` measures both the live site and a long-`siteName` gallery
fixture ("Laboratory of Molecular Neuroscience and Dementia", with the IA six):

- at 768, 900 and 1023px the short wordmark shows, needing 680px;
- at 1024 and 1280px the long wordmark shows, needing 983px;
- the margin at 1024px is only 41px. A `siteName` much longer than the fixture
  clips with an ellipsis instead of wrapping — the `truncate` safety net in
  decision 2 is what catches it, not extra width.

## Step 3, done early

Two commits were cherry-picked from `origin/claude/adoring-ride-si6e4o` onto this
branch: `39ada6b` (`build: emit the generated stylesheet without a data-connected
build`) and `48d091a` (`feat: re-derive the warm preset against the Modern
Instrument palette`). Together they are Phase 3 step 3 done early, ahead of the
screens step.

- **`npm run css:proof`** (`scripts/css-proof.mjs`) runs the same Tailwind
  pipeline `postcss.config.js` gives Next — same plugin, same entry stylesheet,
  same source scan — with no data fetching, and writes the generated stylesheet
  to `node_modules/.cache/css-proof/index.css`. `--grep TEXT` prints only the
  matching lines and exits non-zero when there are none. `npm run build` proves
  the same fact but also statically renders every route, so it needs network
  reach to the Sanity dataset; `css:proof` keeps the "grep what Tailwind
  actually emitted" rule enforceable in an environment (like this worktree) that
  cannot reach the API.
- **The warm preset re-derivation** extends the same guard the tokens already
  had: Phase 1 added five tokens to base and left the presets declaring only the
  original nine, so `warm` inherited cool blue-grey neutrals onto a warm
  surface, including a contrast defect (`--sem-text-faint` at 4.455:1 on
  `--sem-surface-raised` in dark mode, under AA). Four neutrals are now declared
  per scheme, re-derived into the preset's own hue family, keeping each base
  token's tuned lightness and chroma; only warm's dark `--sem-text-faint` needed
  its lightness moved (by 0.010), which takes it to 4.61:1 on raised and 5.41:1
  on surface. `--sem-link-inverse` is deliberately not redeclared — it is
  chromatic, and presets vary neutrals only. This is the preset contrast guard
  from `phase-1-decisions.md` extended to the tokens step 3 originally covered.

## Decisions

1. **Nav items are code-owned, from the IA.** The IA's six (Home · Publications ·
   Research · Resources · People · Lab) live in one module, `navModel.ts`. An item
   renders only when its route exists — today Home, Publications, People, and
   Contact standing in for Lab until Lab ships in step 2. Reason: the CMS's
   `menuItems` field cannot express the IA's fixed six plus per-item "does the route
   exist yet" gating, and code review of the nav should not require a Studio diff.
   *Amended:* this does not retire `menuItems`, `showPublications`, `showPeople` or
   `showContactForm` — they stay in the schema, untouched — because a parallel
   Wix-lookalike track (`redesign/wix`) builds on the same schema and dataset and
   may still read them. `menuItems` stays unread by the redesign chrome, but
   resolved 2026-09-22 (command centre, on Brett's behalf): the three show* flags
   are read for nav visibility only, so the header never links to a 404'd route —
   see "Known limits, carried forward" below. For the same reason,
   nothing here plans or pre-empts the `project` type's retirement.
2. **Wordmark text comes from `resolveBranding`; `siteName` at `lg` and up.**
   Reason: the CMS is the source of truth for the lab's name. *Amended:* `shortName`
   is used **below `lg`** — on the desktop nav between `md` and `lg`, and on mobile —
   because the measured wrap above shows the long wordmark does not fit until `lg`.
   `shortName` falls back to `siteName`, and today both resolve to "Holsinger Lab"
   since the CMS leaves `shortName` unset. If `settings.logo` is set, the Phase 4B
   `Logo` image renders instead of the text. As a last-resort safety net, the text
   wordmark is single-line and truncates with an ellipsis (`title` carries the full
   name), so a long CMS value can clip but can never break the bar's height.
3. **The mobile menu keeps the Headless UI `Dialog`**, for the focus trap, Escape,
   scroll lock and `inert` that e2e already guards, restyled as the design's sheet.
   The panel draws its own copy of the header band at the same position as the band
   beneath it. Reason: this removes both transparent-overlay / click-passthrough
   mechanisms `MobileNavBar.tsx` needed — nothing outside the dialog needs to stay
   clickable while it is open, so a whole defect class goes away with the file.
4. **One sticky header** (`sticky top-0`) at every width, replacing today's `fixed`
   mobile bar and sticky desktop bar. Reason: one positioning mechanism instead of
   two removes the mobile fixed-bar space compensation from `<main>`, while keeping
   the same visual spacing.
5. **Footer = `SiteFooter` styling, content from `settings.footer`.** Each
   non-empty portable-text block becomes one line; the live value is already exactly
   the IA's two lines; an empty field falls back to the IA text. Marks and links
   flatten to plain text since the live content has none. Reason: the copyright year
   stays editable in the CMS rather than frozen in code.
6. **The current page comes from the URL** (`usePathname`), Home matching `/`
   exactly and every other item matching its href or any path beneath it (so
   `/publications/x` marks Publications). Reason: this needs no per-page prop
   threading and stays correct as screens are added in step 2.

## Departures during execution

- **Task 2:** `block` moved out of the shared `WORDMARK` string onto the short span
  alone. Putting both `block` and `hidden` on the same element is the "two
  utilities, same property" trap phase-1-decisions.md already warns about — the
  later-generated one would have won and hidden the wordmark outright.
- **Task 4:** `MobileHeader`'s root became a `<header>` element. With the closed
  band's wordmark sitting outside any landmark, axe's `region` rule failed.
- **Task 4:** the `Dialog` root became `fixed inset-0` rather than `relative`. A
  `relative` root collapsed to a zero-size box, and Playwright read the dialog as
  invisible.
- **Task 4:** the toggle became a fixed `w-16`, so "Menu" and "Close ✕" occupy
  identical boxes and the in-panel Close sits exactly over the outer Menu. The
  in-panel Close takes initial focus (`data-autofocus`).
- **Task 4:** the in-panel toggle's accessible name is "Close", with the ✕ glyph
  `aria-hidden`, where the spec says "Close ✕". Deliberate: this is
  label-in-name (the accessible name is a prefix of the visible text), and the
  ✕ is decorative — it repeats what "Close" already says, so hiding it from the
  accessibility tree does not lose information.

## Deletions and the Wix-track caution

`components/global/Navbar/` (three files) and `components/global/Footer.tsx` are
removed; `components/global/Logo.tsx` and `lib/logo.ts` stay, since image mode is
still used. Two old geometry pass-through e2e tests are deleted, along with the
`logo-contract` assertion that read `MobileNavBar.tsx` — the mechanisms they guarded
no longer exist.

**Coordinate with `redesign/wix` before going further.** `menuItems`,
`showPublications`, `showPeople`, `showContactForm` and the `project` type must not
be retired without checking with that track first — it may read them. Deleting
`components/global/Navbar/*` and `Footer.tsx` here can conflict with `redesign/wix`
at merge time, but only if that branch has also edited those specific files.

## What step 2 must do to the nav model

`navModel.ts`'s `SITE_NAV` currently has `research`, `resources` and `lab` marked
`live: false`, with `contact` standing in for `lab`. Step 2 must:

- flip `live` to `true` on `research`, `resources` and `lab` as each route ships;
- remove the `contact` stand-in entry once `lab` is live, per the comment already
  in `navModel.ts`.

## Known limits, carried forward

- **Resolved 2026-09-22, by the command centre on Brett's behalf: `showPublications` /
  `showPeople` / `showContactForm` are read for nav visibility only.** `liveNavItems`
  now hides `pubs`, `people` and `contact` when their flag is exactly `false`,
  mirroring the `=== false` 404 gate each route already applies, so the header
  never links to a route that 404s. The schema is untouched — no field was added,
  removed or renamed — and `menuItems` is still not read.
  Relatedly, the `menuItems` Studio description is still inert, since the nav
  still does not read `menuItems` at all — noted here as a handover follow-up, not
  fixed in this branch.
- In draft mode, the `PreviewBanner` sits above the sticky header, so the outer
  band and the panel band misalign by about 45px. Editors only.
- Scroll lock adds scrollbar-width padding, so the in-panel Close shifts on desktop
  browsers with classic (non-overlay) scrollbars.
- Nothing guards that an uploaded `settings.logo` actually reaches the header, and
  `Logo`'s SVG wordmark mode 3 is no longer reachable from the header.
- `--sem-rule-strong`'s 1.62:1 contrast target and the type-token consolidation
  from `phase-1-decisions.md` are still open, carried into the screens step.

## Verification

| Command               | Baseline (Task 4, pre-existing)  | Now                                                    |
| ---------------------- | --------------------------------- | ------------------------------------------------------- |
| `npm test`             | 351 passed, 41 files              | 377 passed, 42 files (+30 `navModel`, −4 obsolete `logo-contract`) |
| `npm run type-check`   | clean                             | clean                                                    |
| `npm run lint`         | 0 errors, 4 warnings              | 0 errors, 4 warnings                                     |
| `npm run typegen`      | clean, 16 queries, 36 schema types | not re-run — no query or schema changed                 |
| `npm run build`        | 23 routes                         | 23 routes                                                |
| `npm run test:e2e`     | 102 passed / 5 skipped            | 117 passed / 5 skipped                                   |

## Step 2 — PR A (Publications)

Branch `redesign/phase-3-publications`, off `redesign/integration` at `2c5d7b1`. Spec:
`docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` (§4, §7). Six tasks,
each controller-reviewed to clean before the next started; see `progress.md` in the SDD
working directory for the full ledger.

### What shipped

- **`ui_kits` vendored verbatim, read-only,** to
  `docs/redesign-experiment/design-system/ui_kits/site/` — the design project's screens
  (`Home.jsx`, `PublicationsIndex.jsx`, `PublicationPage.jsx`, `People.jsx`, `Research.jsx`,
  `LabData.jsx`, `README.md`, `index.html`) were never checked in before. They are the
  appearance authority; the IA wins on content where the two disagree (spec §1).
- **`publicationRow.ts` renamed to `publicationModel.ts`,** with its test renamed to match.
  This settles the case-insensitive collision with `PublicationRow.tsx` that
  `phase-1-decisions.md` carried forward as an open item — same directory, same name up to
  case, on a case-insensitive filesystem. `toPublication` is now the one mapping from query
  payload to view, gaining `id`, `href`, `dateLabel`, `abstract` and `resources`.
- **Spec §7 rulings, taken as written:**
  - Publications search, year jump-links and the APA/BibTeX toggle are dropped from the
    index. The IA's block list is count + facets + list; the design has one citation and one
    copy control. `formatApaCitation` moved to `lib/citation.ts`; the BibTeX helpers and
    their tests were deleted with it, since nothing else called them.
  - `PublicationRow`'s ledger grid applies from `lg`, not `md` — the 4-column grid needs
    about 700px of content box, which the `md` rail layout doesn't have. `md` keeps the
    stacked anatomy.
  - `FacetBand` is sticky only from `lg` (`lg:sticky lg:top-(--nav-height)`), static below
    it — three wrapped chip groups plus density would pin half a phone screen otherwise.
  - Tags on `/publications/[slug]` are informational, not links — no URL filter state
    exists on the index, and adding one is out of scope.
- **`publication.slug` is now `required()`** in `schemas/documents/publication.ts`, closing
  the item Phase 2 left open. `npm run typegen` re-run; no type became non-nullable that
  fixtures didn't already treat as present, since 19/19 live records already have unique
  slugs (spec §2).
- **The type backfill must be committed by Brett.** `backfill:publication-types` (`scripts/`)
  is dry-run only in this worktree — `.env.local` deliberately lacks
  `SANITY_API_WRITE_TOKEN`. Brett runs `npm run backfill:publication-types -- --commit` with
  that token set. Until then `publication.type` stays null on all 19 records, the Type facet
  group hides itself (an empty `groups` entry doesn't render), and two e2e tests skip with a
  reason.

### Data gaps carried from spec §2

- **Zero `resource` documents exist.** `ResourceBlock` on `/publications/[slug]` is proven
  entirely by a gallery `PublicationPage` fixture — there is no real data to render it
  against. The block is omitted when `resources.length === 0`, which is every real page
  today.
- **`publication.type` is null on all 19** until the backfill above is committed.
- **`project.researchOrder` is unset** on every project — out of scope for PR A, carried to
  PR C's Research screen.

### Resources route ruling

One `/resources` index page, no per-resource route and no `resource.slug` — the IA gives
resources no pages, and one item launches. (Spec §2 ruling 1; PR C builds the route, but the
ruling was made and recorded here as part of the shared spec PR A also implements.)

### Step 4 dependency: move the `maestro` project's content first

Per spec §2: the `maestro` project document holds the MAESTRO copy (overview + `site` link)
that Home's MAESTRO block will read (PR C, ruling 4). **Step 4 — `project` type retirement —
must move this content to its new home before that document is deleted**, or Home's MAESTRO
block loses its only source. This is a dependency on Phase 3 step 4, not something PR A
changes; recorded here so it isn't missed when step 4 is scoped.

### Departures during execution

- **`Layout.tsx` `childrenStyles` bug (Task 4).** `childrenStyles="px-0"` didn't remove
  `<main>`'s hardcoded `md:`/`lg:` horizontal gutters — a same-property collision
  (`phase-1-decisions.md`'s standing trap), since `px-0` and the hardcoded `md:px-*` /
  `lg:px-*` classes all set the same property and the later-generated one wins. Caught by
  the new 1024px width check, not by eye. Fix: `childrenStyles` now owns all of `<main>`'s
  horizontal padding; `HomePage` passes its old effective classes explicitly so its layout
  is unchanged.
- **`PublicationRow`:** stacked identifiers are protected from the title's 44px hit area,
  so a tap near a DOI/URL line doesn't register as a tap on the title link.
- **`ResourceBlock`:** made responsive — the grid layout applies only from `lg`, and only
  when the resource has a figure. Proven by a gallery `PublicationPage` fixture, since there
  are zero real resource documents to test against.
- **`Tag`:** gained a `wrap` mode so long topics wrap instead of overflowing. A scrollable
  tag row (`overflow-x-auto`) had nothing focusable inside it, which axe's
  `scrollable-region-focusable` rule flags.
- **`FacetChip`:** wraps too, for the same reason as `Tag`, which keeps the hit-area math
  intact instead of trading one defect for another.
- **`PageTitle` / `FacetBand`:** gained mobile gutters. `/publications` overflowed at 375px
  (`scrollWidth` 621 against a 375 viewport) because these two didn't have the responsive
  padding the rest of the page did. Width checks now run at 320 / 375 / 390 / 768 / 1023 /
  1024 / 1280px, not just 768 and up.
- **`SectionRail`:** gained `min-w-0`, so a long unbreakable child (an identifier, a DOI)
  can't force the rail wider than its column.
- **`e2e/interactive-controls.spec.ts`** was rewritten to target `CopyCitation`, since
  `Toggle.tsx` was deleted in this PR and the spec exercised it.
- **The dataset-pinned "10 DOIs" e2e test was dropped.** It asserted exactly 10 rows show a
  DOI identifier and 9 a URL — true of today's 19 records, but not a fact any future dataset
  has to hold. Kept instead: a check that partitions rows into DOI / URL / no-link and
  verifies each partition against the row's own data (a DOI href starts with
  `https://doi.org/`, a URL href equals the row's recorded URL, a no-link row has no
  identifier). The dropped replacement's first pass still silently assumed every row had a
  link — DOI and URL are both optional, so "no link" is valid content the check has to
  allow for, not a case it can rule out by construction. This is PR #30's lesson (every e2e
  assertion must hold for any dataset) applied a second time.

### Two local-testing traps

- **`.next/cache/fetch-cache` survives local builds** and can serve pre-migration Sanity
  data. A stale entry (a roleGroup query cached before the migrations ran, returning `[]`)
  masked as a "pre-existing `/people` failure" until traced to the cache. Clear
  `.next/cache/fetch-cache` before local e2e.
- **A new Playwright run reused a previous run's `next start` on :3000** that was still
  shutting down, producing spurious failures. Wait for :3000 to be free before starting a
  new run.

### Deferred minors (carried, not fixed)

- `FacetBand`'s `ROW` `min-w-0` is inert (the comment describing it is also wrong).
- Wrapping `Tag`/`FacetChip` labels keep `leading-none`, which cramps two-line labels on
  phones.
- At 768–1023px on `/publications`, `PageTitle`/`FacetBand`'s gutters switch at `md` but the
  record-list padding switches at `lg` — the left edges misalign in that range.
- `FacetBand`'s density row has no `flex-wrap`.
- `html { overflow-x: hidden }` in `styles/index.css` silently clips overflow site-wide,
  which can mask a future width regression the same way it complicated diagnosing this one.
- The `Layout` comment is 4 lines, not the 2–3 it should be.

### Verification (run 2026-09-23, this branch)

| Check              | Baseline (`2c5d7b1`)     | Now                                                                 |
| ------------------- | ------------------------- | --------------------------------------------------------------------- |
| `npm test`          | 385                       | **393** (42 files; tests of deleted old-Publications code removed; new model, citation, JSON-LD and type-rule tests added) |
| `npm run type-check` | clean                     | clean                                                                |
| `npm run lint`      | 0 errors, 4 warnings      | 0 errors, 4 warnings                                                 |
| `npm run typegen`   | 16 queries / 40 types     | 16 queries / 40 types                                                |
| `npm run build`     | 23 routes                 | 43 static pages, including 19 `/publications/[slug]`                 |
| `npm run test:e2e`  | 118 passed / 2 skipped (after PR #30) | **142 passed / 4 skipped**                                 |

### The type-backfill dry run

It plans 19 writes (Article 11, Review 7, Case report 1), with no unmatched papers, no
ambiguous matches and no unused rules. Brett runs
`npm run backfill:publication-types -- --commit` with `SANITY_API_WRITE_TOKEN` set. Until
then the Type facet hides itself, and two e2e tests skip with a reason.
