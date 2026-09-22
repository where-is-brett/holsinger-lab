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
  - `FacetBand` is sticky only at min-width 64rem **and** min-height 56rem
    (`[@media(min-width:64rem)_and_(min-height:56rem)]:sticky`), static otherwise — width
    alone isn't enough on a short landscape viewport; per PR A's final-review ruling.
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

## Step 2 — PR B (People)

Branch `redesign/phase-3-people`, off `redesign/integration` at `2c0758c`. Spec:
`docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` (§1, §2, §5). Four tasks,
each controller-reviewed to clean before the next started; see `progress.md` in the SDD
working directory for the full ledger.

### What shipped

- **The spotlight rules.** `shouldShowLabHeadSpotlight` and `excludeLabHead` (carried from
  the old `People.tsx`, now merged into `components/redesign/peopleModel.ts`) gate a single
  block at the top of `/people`: **unset** (`settings.labHead` not set — today's production
  state) renders no spotlight and the lab head sits in the grid as an ordinary card if he
  also has a profile document; **set** renders the `SPOTLIGHT_GRID` block (`PortraitFrame` at
  4:5, name, `fullBio`/`bio` via `PortableBody`, mailto identifier, `Full profile →` when
  `hasPage`) and excludes that profile from the member grid below; **no portrait** falls back
  to `PortraitFrame`'s initials treatment (`initialsOf`, code-point splitting for non-BMP
  first characters) rather than a broken image.
- **The alumni inline list and how the alumni group is identified.** `isAlumniGroup` matches
  a role-group title containing "alumni" (trimmed, case-insensitive substring — no fixed
  taxonomy value is assumed). `splitAlumni` pulls that one group out of `groupByRoleGroup`'s
  output; the screen renders it as a single `<p>` of comma-separated names (each
  `data-testid="alumni-name" data-name={name}`, linked when `hasPage`), not as cards — the
  IA treats alumni as a name list, not a gallery.
- **The photo-less design.** A profile with no `img` renders `PortraitFrame`'s
  initials-and-stripe fallback (`initialsOf`, a repeating-gradient background as an inline
  style, `[ NO PORTRAIT ON FILE ]` caption) at the same 4:5 footprint an image would occupy,
  so the grid never reflows around a missing portrait.
- **`roleDetail`.** An optional second mono line under `role` on `PersonCard`, shown only
  when non-empty (spec §5, ruling 3) — both `role` and `detail` print verbatim, including any
  source misspelling, same rule as publication identifiers.
- **`PortableBody`** (`components/redesign/PortableBody.tsx`), extracted from `People.tsx`'s
  original inline bio-rendering (`BIO_COMPONENTS`/`BIO_PARAGRAPH`/`BIO_LINK`/
  `labHeadBioBlocks`) in Task 3, so both the spotlight (`People.tsx`) and `/people/[slug]`
  (`PersonPage.tsx`) render `fullBio`/`bio` through one shared component instead of two
  copies.
- **The deleted old People components:** `components/pages/people/{People,Profile,Spotlight,
  ContactLinks,PersonBio}.tsx`, plus `components/pages/interactive-elements-contract.test.ts`
  (its one case covered the deleted `Profile.tsx`; no cases remained). The now-empty
  `components/pages/people/` folder is gone.
- **The gallery fixture's wix-preview shape.** `PEOPLE_LAB_HEAD_FIXTURE` (lab head set, no
  portrait — proves the initials fallback), `PEOPLE_PROFILES_FIXTURE` (22 Lab Alumni, every
  third linked via `hasPage`; 10 photo-less International Interns, each with a country in
  `role` and 3 with `roleDetail`; 2 Research Scientists with photos), and an ungrouped entry
  reusing the lab head's real `_id`/`name`/`role`/`hasPage`/`slug` shape with `roleGroup: null`
  — proving the exclusion rule (instance (a), spotlight shown, she's excluded from the grid)
  against its absence (instance (b), no `labHead` set, she reappears as an ordinary card).
  `app/preview/components/Gallery.tsx` renders both instances.

### Departures during execution

- **`PageTitle` gained a `headingLevel?: 'h1' | 'h2'` prop** (default `'h1'`, every real
  route unaffected). The gallery renders two People instances on one non-routed preview page
  that already has its own `<h1>`; a duplicate default `<h1>People</h1>` twice over would
  make that page read to assistive tech as three separate top-level documents. Both gallery
  instances pass `headingLevel="h2"`, matching the level of the gallery's own per-section
  headings.
- **`PageTitle`'s meta span gained `min-w-0`,** paired with the existing `md:flex-shrink-0`.
  People's longer meta string (`"LAB HEAD + n CURRENT MEMBERS · g GROUPS"` vs. Publications' shorter
  one) overflowed at 320/375px — the meta span had no minimum-width override, so it could not
  shrink below its own content's width inside the flex row.
- **The member group titles are real `<h2>`s,** not `<span>`s, so they show up in a screen
  reader's headings list for page navigation — same visual class, no layout change (Preflight
  already zeroes `h2`'s default margin).
- **The implicit grid track caused overflows at 320px** in both `PersonPage`'s `PROFILE_GRID`
  and `People.tsx`'s `SPOTLIGHT_GRID`, from an unbreakable email token in the bio (the live
  dataset's one `hasPage` profile has an email address inlined as plain bio text; the gallery
  fixture was extended with the same shape to reproduce it). Precise cause: neither grid had
  an explicit column track below `md`, so the browser fell back to one implicit auto track,
  and an **auto track's min-content floor** is set by the widest unbreakable run inside it —
  not, as first suspected, the track's max-content width. Fix: an explicit `grid-cols-1`
  (which Tailwind compiles to `grid-template-columns: repeat(1, minmax(0, 1fr))`, zeroing that
  floor on its own) alongside the existing `md:grid-cols-[220px_1fr]`, plus `min-w-0` on the
  text column as belt-and-braces, matching the existing convention of guarding every
  grid/flex item that holds unpredictable CMS text.
- **`PersonCard`:** a linked card's portrait image gets `alt=""` (decorative), since the name
  text rendered right below it inside the same link already carries the content. Unlinked
  cards keep `alt={name}` on the image, since there's no link to collide with. The colour
  reveal (grayscale portrait → full colour, name → link colour) also triggers on keyboard
  focus (`group-focus-visible:` pairs mirroring every `group-hover:` one), not just mouse
  hover. `sizes` gained an `lg` step (`(min-width: 1024px) 15vw, (min-width: 768px) 30vw,
  50vw`) matching `CARD_GRID`'s actual `grid-cols-2`/`md:grid-cols-3`/`lg:grid-cols-6`
  breakpoints — the previous two-step value was carried over from the old `Profile.tsx`'s
  3-up desktop grid and under/over-declared the served image width against the new 6-up
  layout.

### Final-review fix wave (2026-09-23)

- **Ruling: the trailing ungrouped catch-all is unheaded (spec §5.3).** `groupByRoleGroup`
  now gives the catch-all `title: null` unconditionally — never a literal "Other" heading —
  whether or not it sits alongside named role-group sections, and it is never counted in the
  meta's group count. Previously the catch-all's title was only nulled when it was the *only*
  section; alongside a named section it rendered as a real "Other" heading and counted toward
  `g`, which the spec ruling does not allow. `components/redesign/screens/People.tsx`,
  `components/redesign/peopleModel.ts` (and its unit tests), and `e2e/people.spec.ts`'s own
  `computeSections` mirror all updated to match; the gallery fixture (`fixtures.ts`) already
  exercises this shape (an ungrouped entry alongside three named role groups).
- **Ruling: `PersonCard`'s link no longer carries `aria-label={name}`.** With the image's
  `alt=""` still in place, an `aria-label` on the `Link` collapsed its accessible name down to
  just the person's name, hiding the role and roleDetail text from screen-reader users
  navigating by link — the sighted experience (name, role, detail all visible inside the same
  link) and the accessible one now match. `e2e/redesign-components.spec.ts`'s
  `getByRole('link', { name: 'Élodie Ñúñez' })` locators are unaffected: Playwright's default
  `exact: false` substring match still finds the link once its accessible name grows to
  include the role text.
- **`PersonCard`'s name/role/detail lines gained `break-words`.** None of the three wrapped
  before; a long unhyphenated token — a surname ("Priya Balasubramaniam") or a parenthesised
  `roleDetail` ("(Neuroscience/Pharmacology)") — overflowed the ~111px card width the base
  2-column grid gives each card at 320px. The gallery fixture (`fixtures.ts`) now carries both
  shapes in the grid's rightmost column so `/preview/components`'s existing 320px overflow
  check actually exercises this (confirmed red before the fix, green after — see
  `final-fix-report.md`).
- **`initialsOf` hardening.** `.normalize('NFC')` first (a decomposed name's accents no longer
  get silently dropped), a leading honorific (`Dr`, `Dr.`, `Prof`, `Prof.`, `Professor`,
  case-insensitive) is skipped when more words remain, and a word that doesn't start with a
  Unicode letter (`\p{L}`) — e.g. a parenthesised qualifier like "(DDS)" — is ignored when
  picking the first/last word.
- **`e2e/people.spec.ts`'s meta assertion scoped to `PageTitle`'s own meta span**, via a new
  `data-testid="page-title-meta"` on it (`PageTitle.tsx`), replacing a page-wide
  `getByText(/CURRENT MEMBER/)` that risked matching more than the intended element.

### Carried forward to PR C

`e2e/image-geometry.spec.ts`'s "image frames are dimmed" test now points at `/` — it used to
target `/people` against a `.media-frame` class the old `Profile.tsx` rendered and the new
`PersonCard`-based screen never does. `/` is still on the old design system, so this will
probably break when Home is rebuilt.

### Verification (run 2026-09-23, this branch)

| Check                | PR A (`redesign/phase-3-publications`) | Now (PR B)                    |
| --------------------- | ---------------------------------------- | -------------------------------- |
| `npm test`            | 393 passed                               | **413 passed**, 39 files        |
| `npm run lint`        | 0 errors, 4 warnings                     | 0 errors, 4 warnings             |
| `npm run typegen`     | 16 queries / 40 schema types             | 16 queries / 40 schema types     |
| `npm run build`       | 43 static pages, including 19 `/publications/[slug]` | 43 static pages, including 19 `/publications/[slug]` and 1 `/people/[slug]` |
| `npm run test:e2e`    | 142 passed / 4 skipped                   | **166 passed / 5 skipped**       |

## Step 2 — PR C (Research, Resources, Home)

Branch `redesign/phase-3-home`, off `redesign/integration`. Spec:
`docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` (§1, §2, §6). Three
tasks (Resources, Research, Home), each controller-reviewed to clean before the next started;
see `progress.md` in the SDD working directory for the full ledger.

### Empty states

All three screens are honest about missing data rather than hiding themselves or the nav:

- **`/resources`** with zero `resource` documents renders one unlabeled `SectionRail` saying
  "No resources are listed yet." — the live case today.
- **`/research`** with zero `defined(researchOrder)` projects renders the meta as
  `0 ACTIVE PROJECTS` and one `SectionRail` saying "Research projects will be listed here
  soon." — also the live case today (`researchOrder` is unset on every project).
- **Home's five blocks** (Identity, Recent work, Resources, Outreach/MAESTRO, The lab) are each
  omitted independently when their own data is missing — no block renders an empty shell. On
  live data today, the blocks that render are Identity, Recent work, MAESTRO, and The lab
  (member count plus Support) — there is no Resources block and no PI panel today.

None of this is simulated — every state above is what the live dataset actually produces today;
the populated states are proven only by gallery fixtures (`/preview/components`).

### `researchOrder` — the shared selector

`researchProjectsQuery` selects `defined(researchOrder)`, ordered by it. This field is the
selector the parallel Wix-lookalike track (`redesign/wix`) also reads from the same schema and
dataset — Research was built to handle 4+ projects (the gallery fixture carries five), not just
the two the live dataset happens to have today once `researchOrder` is set.

### Covers keep their intrinsic ratio

`researchModel.ts`'s `toResearchView` is a pure payload→view mapping. Its `coverView` is `null`
when there's no `coverImage`, no `metadata.dimensions`, or `urlForImage` can't resolve a URL.
With no `crop`, `width`/`height` come straight from the asset's native `metadata.dimensions` and
`src` carries no size params — the cover is never resized off its native upload size. With a
`crop`, `width`/`height` are scaled by `(1 - left - right)` / `(1 - top - bottom)` and `src` is
requested at exactly that width/height with `fit('crop')`, because `@sanity/image-url`'s own
`fit()` only applies the crop rect's pixel size when both dimensions are requested explicitly —
otherwise it delivers the full uncropped asset regardless of what the editor chose in Studio.
When a project has no cover, the narrative grid drops to a plain single-column track
(`NARRATIVE_GRID_SOLO`) rather than leaving the `lg:grid-cols-[1fr_380px]` track's second column
empty — a two-column grid with only one child would otherwise reserve a blank 380px box.

**Ruling (fix round 1):** `Research.tsx` originally had a fixture-only branch in its own
`coverAsset` helper, routing a `/`-prefixed asset id straight to a local `/public` PNG instead of
through `urlForImage` — production-file logic that existed solely to support four synthetic
fixture aspect ratios. That branch is gone. `toResearchView` is the only cover-resolving code
path, real and fixture alike, and **no binary fixtures ship**: the gallery's four cover ratios
(0.90 / 1.05 / 1.40 / 2.05) are built by requesting the one real Sanity photo already used
elsewhere in `fixtures.ts` at four `width`/`height` pairs via `urlForImage(...).fit('crop')` —
genuine, verifiable `cdn.sanity.io` URLs, not synthesized images. The earlier
`public/fixtures/research-cover-*.png` files and the now-empty `public/fixtures/` directory were
deleted.

### Enquiry email resolution

`researchModel.ts`'s `enquiryEmail(settings)` resolves, in order: trimmed
`settings.contact.email`, then trimmed `settings.labHead.email`, then nothing (`null`). The
Research screen's Enquiries band renders the resolved email as a `mailto:` identifier when one
exists; otherwise "get in touch" links to `/contact` when `showContactForm !== false`; otherwise
the sentence ends at "welcome." with no link at all. Live data today has no email set and
`showContactForm: true`, so only the `/contact`-link branch is reachable against the real
dataset — the email branch and the no-link-at-all branch are proven by permanent gallery
fixtures (`gallery-research-contact-link`, `gallery-research-no-link`) added specifically because
live data can't reach them.

### MAESTRO

Home's Outreach block reads the `maestro` project document: title printed **verbatim, including
the "endevor" typo**, overview through `PortableBody variant="inverse"`, and a "REGISTER —
`<site without scheme>`" link when the project's `site` field is set. The block is omitted
entirely if the `maestro` document doesn't exist.

**Step 4 must move this content before retiring that document, or Home loses the block.** Step 4
(retiring the `project` type) redistributes the five `project` documents per `agreed-ia.md` §2 —
MAESTRO becomes a Lab section — but until that migration runs, Home's Outreach block has no
other source for this copy. This was already flagged in PR A's "Step 4 dependency" note; PR C's
own Home implementation is the concrete thing that would break.

### Home's title and overview

Home uses the existing `home.title` and `home.overview` fields only — no new editorial fields
were added to the `page`/`home` schema. `home.title` falls back to the resolved site name when
unset; a **whitespace-only title counts as unset** (`home.title?.trim() || siteName`, matching
`resolveBranding`'s own rule for `siteName`). The tagline is `plainTagline(home.overview)` — the
portable-text overview flattened to plain text via `toPlainText`, `null` (falling back to the
IA's stand-in copy) when the field is unset, an empty array, or whitespace-only.

### Member count

Home excludes the lab head from `currentMemberCount` **only when its own PI panel is actually
rendering** (`showPiPanel ? labHead?._id : null`), mirroring how `/people` gates its own
exclusion on whether its spotlight is showing, rather than reading `/people`'s flag directly —
a page's count should stay internally consistent with what that same page renders, not depend on
a different page's unrelated setting. The two pages' counts agree whenever
`showLabHeadOnHome`/`showLabHeadOnPeople` carry the same value (the common case), and are allowed
to genuinely differ when an editor deliberately sets them differently. `e2e/home.spec.ts`
cross-checks this against `/people`'s own rendered "N CURRENT MEMBERS" meta text, skipping only
when the two flags disagree or either page can't render its count.

**The members line renders only when the count is above zero** — a "0 — PEOPLE →" line is not
honest content, so `showMembersLine = showPeople && memberCount > 0`. "The lab" block itself
still renders if the PI panel or the Support link has content, even with `showMembersLine` false.

### Shared `resourceModel`

`formatSource` and `buildResourceMeta` (KIND/SOURCE/DOI-or-URL row building) were duplicated
between `Resources.tsx` and Home's own copy in the first Home pass. Both now live in
`components/redesign/resourceModel.ts`, imported by both screens, so Home and Resources can't
drift on how a resource's meta is built.

### `PortableBody`'s `variant` prop

`PortableBody` gained a `variant?: 'body' | 'lead' | 'inverse'` prop (default `'body'`), each a
whole, separate paragraph/link class string — never one string with a bolted-on colour or
font-size override, per the standing same-property-collision rule. `'body'` is the original
`People`/`PersonPage` styling, unchanged. `'lead'` (Research's project overviews) is larger and
uses the default text colour. `'inverse'` (Home's MAESTRO overview, on the dark `SectionRail
inverse` background) uses `text-text-inverse-muted` and its own inverse link colour. (Originally
named `size`; renamed to `variant` once the `'inverse'` case made clear it changes more than
size.)

### Nav

`research` and `resources` are flipped to `live: true` in `navModel.ts` — both routes go live in
the nav even though production has zero `researchOrder` projects and zero `resource` documents
today. This is the controller's ruling (recorded in `progress.md`'s preflight scan): making nav
visibility data-driven would add a query to every page's `Layout`, just to avoid two links to
honest-empty-state pages until the Wix import / resource creation land. `lab` is still `live:
false`; `contact` still stands in for it, unchanged from step 1.

### Revalidation

`app/api/revalidate/route.ts` gained/extended cases for PR C's new data dependencies:

- **`page`** now also revalidates `/` — a `page` document can be the Support link's target
  (`support-our-research`), which Home reads on every render.
- **`project`** now also revalidates `/research` (which lists every `defined(researchOrder)`
  project) alongside its existing `/projects/[slug]` and `/` — a `project` edit could be either a
  Research project or the `maestro` project Home reads, and the webhook payload doesn't
  distinguish them cheaply, so both revalidate on every `project` edit.
- **`profile`** now also revalidates `/` — Home's member count and PI panel both depend on
  `profile` documents.
- **`roleGroup`** (new case) revalidates `/people` and `/` — role groups drive `/people`'s
  grouping and Home's `currentMemberCount` (which group counts as alumni).
- **`resource`** (new case) revalidates `/resources`, `/` (Home shows the first resource) and the
  whole `/publications/[slug]` page type — a `resource` document carries no publication slug in
  the webhook payload and has no `slug` of its own (spec §2 ruling 1), so every publication page
  revalidates, matching the existing `publication` case's own blanket call.

### Image-geometry retarget

`e2e/image-geometry.spec.ts`'s "image frames are dimmed in dark mode only" test used to target
`/` on the assumption Home still rendered `ImageBox`/`.media-frame` (pre-redesign). The rebuilt
Home renders zero such elements — its one image, the PI portrait, is a dedicated `PiPortrait64`
component using `next/image` directly. The test now resolves the first `project` with a
`coverImage` via a live Sanity query and targets `/projects/<slug>` (still on `ImageBox`), and
**skips honestly** (with a reason) if no such project exists. `/` was also dropped from the
"routes that render at least one cover image" sweep (Home renders zero images against live data
today — `labHead` is unset) but kept in the separate "no literal `undefined` class" sweep, since
Home still renders `PublicationRow`/`ResourceBlock`/portrait classes that sweep exists to check.

### Deleted

The old Home components — `components/pages/home/{HomePage,FeatureRow,ProjectListItem}.tsx` and
`feature-row-contract.test.ts` — are gone, along with the now-empty `components/pages/home/`
directory. `shouldShowLabHeadCard` and `resolveLabHeadHref` (previously
`components/pages/home/{shouldShowLabHeadCard,resolveLabHeadHref}.ts` + tests) moved unchanged,
apart from import paths, into the new `components/redesign/homeModel.ts` /
`homeModel.test.ts`, alongside the new `currentMemberCount` and `plainTagline`.
`components/shared/Header.tsx` was **not** deleted — it's still imported by
`components/pages/page/Page.tsx` and `components/pages/project/ProjectPage.tsx`.

### Local-testing note

A local `npm run build` on this checkout's Next 16.3.1 regenerates `next-env.d.ts`, dropping a
`next/navigation-types/compat/navigation` triple-slash reference every time — this is genuinely
reproducible on every build, not a one-off. Restore it with
`git checkout origin/redesign/integration -- next-env.d.ts` and confirm `git diff` is empty
before every commit; carried forward from Task 2's original report, which mistakenly believed
one revert had settled it for good.

### Verification (run 2026-09-23, this branch, final)

| Check              | PR B (`redesign/phase-3-people`)                                      | Now (PR C)                                                                |
| --------------------| ------------------------------------------------------------------------| -----------------------------------------------------------------------------|
| `npm test`          | 413 passed, 39 files                                                    | **466 passed**, 39 files                                                    |
| `npm run lint`      | 0 errors, 4 warnings                                                    | 0 errors, 4 warnings                                                        |
| `npm run typegen`   | 16 queries / 40 schema types                                             | **22 queries / 40 schema types**                                             |
| `npm run build`     | 43 static pages, including 19 `/publications/[slug]` and 1 `/people/[slug]` | **45 static pages**, adding `/research` and `/resources` (`/support-our-research` is a pre-existing `page` route, not one this PR adds) |
| `npm run test:e2e`  | 166 passed / 5 skipped                                                   | **211 passed / 6 skipped**                                                   |
