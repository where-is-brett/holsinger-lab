# Wix lookalike on Sanity — design

Date: 2026-09-22 · Branch: `redesign/wix` (off `origin/redesign/integration`) · Status: **draft for Brett's review**

## 1. Intent

**What was asked.** Build a near 1:1 visual copy of the lab head's Wix site
(https://damianholsinger6.wixsite.com/holsinger-lab), rendered from our Sanity dataset
(`j3f9z8os` / `production`). It will be shown to Damian beside the Modern Instrument redesign,
so both sites must read the **same dataset**. Why Damian prefers Wix is out of scope.

**Decided by the command centre, with Brett's delegation:**

- Source of truth is *merge and correct*. Anything Wix has that Sanity lacks gets added.
  Where the same field conflicts, **Wix wins**. Nothing is ever deleted. Sanity-only records
  stay, and §9 lists them for Damian to decide on.
- There are six role groups, in this order, and the migrations session writes them:
  Research Scientist, PhD Candidate, Honours Student, Research Student, International Interns,
  Lab Alumni. This track creates no role groups.
- Every production write needs an explicit yes, per write, sent through the command centre.

**Assumptions in this spec (correct any of them in review):**

- "1:1" means Wix's visual system, page structure and copy. It does **not** mean
  reproducing Wix's defects: the mobile hero text overflowing the image, the duplicate
  "Rene Buxton" alumni row, the "More" overflow item in the desktop nav.
- Wix ships two hand-built layouts (a 980px desktop layout and a 320px mobile layout), chosen
  by device. We build one responsive site that renders the desktop design from `md`
  (768px) up and the mobile design below it.
- Two Wix fonts are licensed (Didot W01 Italic, Proxima Nova). Free lookalikes are
  acceptable (§4).
- Light mode only. Wix has no dark mode.

**Success criteria.**

1. All 7 routes render at 1280px and 390px, and side by side with Wix a reader sees the same
   site: same fonts, sizes, colours, order, rules and imagery.
2. Every piece of copy on those pages comes from Sanity. The one exception is fixed chrome
   (page headings and nav labels), which is hardcoded, just as it is fixed in Wix's template.
3. The redesign on `redesign/integration` still builds, and its Studio shows every new field,
   with no errors or unknown-field warnings.
4. The import is idempotent and dry-run by default. A re-run after Damian has edited content
   changes nothing he edited.

## 2. The Wix site as captured

Captured in the browser on 2026-09-22 at 1280×900 and 375×812, from computed styles. The
full token table is in Appendix A.

| Page | Wix path | Content |
|---|---|---|
| Home | `/` | Hero photo (a microscopy collage) with an overlay heading and italic subheading. "About the Laboratory" paragraph. Three research themes (bold title plus a one-line summary). "News & Highlights" (4 items: headline plus body). "CONTACT US" block. |
| Research | `/research` | "RESEARCH PROJECTS" and 4 projects, each a bold title, a paragraph and an optional figure. |
| News | `/news` | "Latest news" and 3 one-sentence items. These are **different sentences** from the Home highlights. |
| Publications | `/publications` | "PUBLICATIONS" and 17 entries: title, authors, italic citation line, `doi:` link. |
| Team | `/blank-5` | "Our Team", an intro paragraph and 12 current members (photo, name, italic role on 1–2 lines). Then "Lab Alumni / 2020 - present": 6 alumni with photos, 16 name-only rows (name plus italic qualifier) and "International Interns" (6 rows: name plus country). |
| Media | `/media` | 3 appearances: title, italic outlet and date. One is a self-hosted Channel 7 video (mp4, 1894×1080). Two link out to ABC and SMH. |
| Contact | `/blank-4` | A "support our research" line, then the same "CONTACT US" block. There is no form. |

**Shared chrome:** a centred Playfair site title, a 1px rule, a centred Raleway nav of 7 items,
and a footer reading "©2026 by Damian Holsinger". On mobile the title is left-aligned beside a
hamburger that opens a full-screen `#bfbfbf` menu (centred items with dividers).

**Portraits are rectangular, not round.** Only Johnny Chan's photo is circular, and that is
baked into the image file. We render every portrait as a plain rectangle, which reproduces this.

## 3. Approaches considered

**A. Separate branch and separate Vercel preview (chosen).** Branch `redesign/wix` off
`redesign/integration`. The page layer is replaced on this branch only. The schema additions
go *upstream* into `redesign/integration` as their own small PR, so both branches (and both
embedded Studios) share one content model.

- Pro: Phase 3 can rebuild layouts in parallel without any merge conflicts.
- Pro: Wix's URLs stay at the root, matching the Wix site.
- Pro: the two sites can be shown to Damian as two links.

**B. One branch, with a `/wix/*` route group and its own root layout.** This gives one
deploy, but it puts the page layer in the path of Phase 3's in-flight `Layout` rewrite. It
also prefixes every Wix URL and couples the two tracks' release timing. Rejected.

**C. A separate app or repo.** This would duplicate the Sanity client, the Studio, the
revalidation and the draft mode. Rejected.

## 4. Visual system

A dedicated stylesheet (`styles/wix.css`) is loaded only by this branch's root layout. The
redesign's `--sem-*` tokens and warm presets are not loaded. Tailwind 4 stays. Every Wix token
is declared on `:root` **and** mapped in `@theme inline`, because both halves are required
(`phase-1-decisions.md` §2). The Phase 1 standing rules apply unchanged:

- Every component task must build and grep the emitted CSS.
- Use `x-(--var)` syntax, never `x-[--var]`.
- Never let two utilities set the same property.

**Fonts** are loaded with `next/font/google`:

| Wix face | Used for | We use |
|---|---|---|
| Playfair Display 400 / 400i / 700 | site title, headings, names, publication titles and authors, media rows | Playfair Display, same weights |
| Lato Light 300 (and 700 for research project titles) | body copy | Lato 300 / 300i / 700 |
| Raleway 400 | desktop nav, Team intro, contact block, footer | Raleway 400 |
| Didot W01 Italic *(licensed)* | roles, alumni subtitle, publication citation and DOI lines | **Bodoni Moda italic**, the closest free Didone italic |
| Proxima Nova *(licensed)* | mobile menu items only | **Montserrat 400** |

**Colour.** Text is `#000` everywhere, with the active nav item `#191919`. Page backgrounds
are `#fff`, with a `#f7f7f7` content strip on Research, News, Publications and Contact. There
is a 1px `rgba(0,0,0,.85)` rule under the site title. The hero caption panel is
`rgba(0,0,0,.3)`, 5px radius, `0 1px 4px rgba(0,0,0,.6)`. Links are black with no underline.
The mobile menu is `#bfbfbf`, with dark dividers.

**Layout.**

- Desktop: a 980px content column, centred, with full-bleed strips. The Team grid is 5
  columns across about 1220px. The hero image is full-bleed at 429px tall.
- Below `md`: the column is fluid with 16px gutters and every grid collapses to one column,
  following Wix's mobile layout. Type steps down to the Wix mobile sizes in Appendix A.
- Between 768px and 1012px the 980px column shrinks fluidly. Wix would scroll horizontally
  here; we don't.

## 5. Content model additions

Every change is additive. No existing field is renamed, retyped or removed. The changes land
in `redesign/integration` first (§7).

**New document `newsItem`** (Studio title "News")

- `title` (string, required): the Home headline, e.g. "Honours Thesis Submitted".
- `body` (portable text: bold, italic, links): the Home highlight text.
- `summary` (string): the one-sentence line on the News page. If empty, the News page falls
  back to `title`.
- `date` (date, required): sets the order, newest first.
- `showOnHome` (boolean, default true) and `showOnNewsPage` (boolean, default true). Both are
  needed because Wix's "Highly Cited Article" is on Home but not on the News page.

**New document `mediaAppearance`** (Studio title "Media")

- `title` (required), `outlet` (required), `date`, `url` (optional; the external article link)
- `video` (file, mp4, optional) plus `poster` (image, optional). If a video is present it
  renders as an inline `<video controls>` player. Otherwise the title links to `url`.

**New singleton `siteCopy`** (Studio title "Site copy")

This holds the editorial copy that only the Wix layout uses. Keeping it off `home` leaves the
redesign's plan for a zero-editorial Home intact.

- `hero`: `image` (with hotspot and alt), `heading`, `subheading`
- `about`: `heading`, `body` (portable text), `themesIntro`, and `themes[]` of `{ title, summary }`
- `teamIntro` (text), `alumniSubtitle` (string, "2020 - present"), `contactIntro` (string)

**`settings`: new `contact` object** (shared by both sites): `address`, `email`, `phone`.

**`profile`: two new optional fields**

- `roleDetail` (string): the second italic line Wix shows under the role, e.g. "(Diagnostic
  Radiography)" or "Honours Class I".
- `sortOrder` (number): the curated order within a role group. Where it is unset, profiles
  sort by name.

**`project`: one new optional field**

- `researchOrder` (number). A project with this field set appears on the Research page,
  ascending.

**Decision on `project` (the redesign's step 4 is waiting on this).** The four Wix research
projects **stay on `project`**. Two already exist: glial activity, and gut microbiota, which
is retitled to Wix's "Fecal microbiota transplantation as a treatment for Alzheimer's disease"
because Wix wins. The other two are added. So Phase 3 may **not remove the `project` type**.
It may still retire the three non-research project *documents* (PI bio, MAESTRO, Publication
highlights), because this site does not read them. The Wix site needs **none** of
`settings.menuItems`, `showPublications` or `showPeople`: its nav is fixed chrome. The
redesign may retire those fields whenever it likes.

**Alumni and interns are `profile` documents**, not a lighter type:

- There are 22 new profiles. Alumni go in Lab Alumni and interns in International Interns.
- An intern's country goes in `role`, e.g. `role: "France"`.
- A name-only alumnus has no image. Rendering follows one rule: a profile **with** an image
  is a photo card, and one **without** an image is a text row. This reproduces Wix exactly.
- The redesign's People page gets the alumni for free.
- `hasPage` stays false, so no new person pages appear on either site.

Everything goes through `npm run typegen`. `app/api/revalidate/route.ts` learns the new types.

## 6. Routes and components (on `redesign/wix` only)

| Route | Data |
|---|---|
| `/` | `siteCopy`; `newsItem` where `showOnHome`; `settings.contact` |
| `/research` | `project` where `defined(researchOrder)`, ordered by `researchOrder`: `title`, `description` (portable text), `coverImage` |
| `/news` | `newsItem` where `showOnNewsPage` |
| `/publications` | every `publication`, ordered by `date desc` |
| `/team` | `siteCopy.teamIntro`; `profile`s grouped by `roleGroup` in the migration's group order, then by `sortOrder`, then by `name` |
| `/media` | `mediaAppearance`, ordered by `date desc` |
| `/contact` | `siteCopy.contactIntro`; `settings.contact` |

- **Redirects** in `next.config.mjs`: `/blank-5` → `/team`, `/blank-4` → `/contact`
  (permanent). Anyone arriving on an old Wix path lands on the right page.
- **Removed on this branch only:** `/people`, `/people/[slug]`, `/projects/[slug]`,
  `/[slug]`, `/publications/[slug]` and `/preview/components`.
- **Kept:** `/studio`, `/api/*`, draft mode, live preview (`sanity.live`), `sitemap`,
  `robots`, `manifest`. On this branch `robots` must be `noindex`, because it is a preview
  deploy.
- **Components** live in `components/wix/`, one unit per visual block:
  - `SiteHeader` (title, rule, nav), `MobileMenu`, `SiteFooter`
  - `Hero`, `AboutThemes`, `NewsHighlights`, `ContactBlock`, `ResearchProject`
  - `PublicationEntry`, `PersonCard`, `NameRow`, `MediaRow`
- **Pure helpers** get unit tests:
  - `formatCitationLine(pub)` builds Wix's "Journal Year; vol(issue):pages." from structured
    fields.
  - `groupTeam(profiles, groups)` handles current members, photo alumni, name-only alumni and
    interns.
- **Stega:** strings used as `alt`, `href` or in JSON-LD are cleaned with `stegaClean`. This is
  the lesson from Phase 2D.

## 7. Cross-track coordination

1. **Schema-first PR into `redesign/integration`.** It contains §5 only: schemas, typegen,
   revalidate types, and schema unit tests. It adds no screens. Once it merges, both Studios
   know every type, and `redesign/wix` rebases onto it.
2. **Import ordering.** The import runs only **after** the migrations session has written the
   six role groups, `settings.labHead` and the backfills. It references role groups by
   querying for them by title, and it fails loudly if any are missing. It never creates them.
3. **Phase 3.** Keep the `project` type. You may drop `menuItems` and `show*` whenever you like.
   Profiles now include alumni and interns, so the People page should expect about 22 more
   entries in the Lab Alumni and International Interns groups.

## 8. Content import

- **Snapshot, then transform.**
  - `data/wix/snapshot.json` is a committed, human-readable record of the Wix content: every
    string plus the original `static.wixstatic.com` asset URLs. It is captured once in the
    browser, so it becomes a reviewable diff. Wix is JS-rendered, so it cannot be scraped
    headlessly with any reliability.
  - `scripts/import-wix.ts` turns the snapshot into Sanity mutations.
- **Identity.** New documents get deterministic `_id`s (`wix-news-<slug>`, `wix-media-<slug>`,
  `wix-profile-<slug>`, `wix-project-<slug>`). A re-run patches instead of duplicating. Existing
  documents are matched through an **explicit match table** in the snapshot (for example Wix
  "Dr Johnny Chan" → Sanity "Dr Johnny Chan (DDS)"), never by fuzzy matching.
- **Wix wins, scoped.**
  - Profiles: `name`, `role`, `roleDetail`, `roleGroup`, `sortOrder` take the Wix value.
  - Research projects: `title`, `description`, `coverImage` take the Wix value.
  - Publications are the one scoped exception. Wix shows a *composite* citation string, and
    parsing it back into `volume`, `issue` and `pages` would degrade good structured data. So
    publications only **gain** the 2 missing papers and any missing DOI. Every other difference
    is reported in the dry run and not written.
- **Idempotence without clobbering Damian.** The importer writes only fields whose current
  value still equals either the pre-import value or the last imported value. Anything Damian
  has edited since is reported and skipped. This is what makes success criterion 4 true.
  - The per-field hashes live in one ledger document, `_id: "wix-import.ledger"`, not on the
    content documents. Extra fields on shared documents would raise Studio unknown-field
    warnings (success criterion 3).
  - Its dotted id keeps it out of public queries, and it has no schema type, so it stays out
    of the Studio desk.
- **Assets.** Images and the one mp4 are uploaded from the original Wix URLs. Sanity dedupes
  identical assets by content hash, so a re-run adds nothing.
- **Safety rails.**
  - Dry-run by default. It prints every create and patch, grouped by type, plus the Sanity-only
    list from §9.
  - `--commit` requires `SANITY_API_WRITE_TOKEN`. Worktrees don't carry that token, per the
    Phase 1 environment note.
  - Before any commit, run `sanity dataset export production` to a dated local tarball.
  - Every production run happens only after Brett's explicit yes, relayed through the command
    centre.
  - **No deletes exist in the code path.**
- **Wix defects are corrected in the snapshot and flagged:** the duplicate Rene Buxton is
  imported once.

## 9. Sanity-only records (Damian to decide)

These stay as they are. They will appear on both sites unless Damian removes them in Studio.

- **Publications not on Wix:**
  - Altered Brain Adiponectin Receptor Expression in the 5XFAD Mouse Model (2020)
  - Selective, high-contrast detection of syngeneic glioblastoma in vivo (2020)
  - Cyclical amyloid beta-astrocyte activity induces oxidative stress in AD (2020)
  - Identification of molecular signatures and pathways… systems biomedicine perspective (2020)
- **People not on Wix:** Fritz Graham (Study Abroad Student) and Jiyoo Choi (Undergraduate,
  no photo).
- **Project documents** the Wix site doesn't show: "About Dr Damian Holsinger", MAESTRO,
  "Publication highlights".
- **`page` documents:** Recent Lab Alumni, Miscellaneous, Support our research, Tutorial.

## 10. Testing and verification

- **Unit (Vitest):**
  - importer transform: match table, Wix-wins scope, the skip-if-edited rule, no-delete
    invariant, deterministic ids
  - `formatCitationLine`
  - `groupTeam`
  - schema tests for the new types
- **E2E (Playwright, against a production build):**
  - all 7 routes return 200, and both redirects work
  - **computed-style assertions** against Appendix A for each page's key elements
    (font-family, size, weight, colour) at 1280px and 390px
  - mobile menu opens, traps focus and closes
  - axe passes on every route
  - no horizontal scroll at 390px or 800px
- **CSS proof:** each component task builds and greps the emitted stylesheet (Phase 1 rule).
- **Side-by-side review:** before this goes to Damian, publish a comparison page with paired
  Wix and lookalike screenshots of every route at both widths for Brett to sign off. A pixel
  diff against the live Wix site isn't feasible (lazy loading, Wix chrome, font substitutes),
  so the human pass is the real acceptance test.
- **Redesign safety:** after the schema PR, `redesign/integration`'s `npm test`, type-check,
  lint and build all stay green.

## 11. Deployment

`redesign/wix` deploys as its own Vercel preview. It needs the same env vars as
`redesign/integration`, without the write token. It never merges to `main`. Whether it merges
anywhere at all depends on what Damian chooses.

## 12. Out of scope

- Wix platform chrome: the "built on Wix" banner, "Let's Chat", the scroll-to-top button.
- Contact forms (Wix has none).
- Dark mode.
- Any redesign feature: facets, publication pages, resources, JSON-LD beyond what exists.
- Writing to production outside the approved import.
- Deciding the §9 items.

---

## Appendix A — measured tokens (Wix, computed styles)

Desktop at 1280px. The Wix column is x = 150–1130.

| Element | Font | Size / line height | Weight / style | Other |
|---|---|---|---|---|
| Site title | Playfair Display | 32 / 43.2 | 400 | centred; rule 1px `rgba(0,0,0,.85)` at 940px wide, 20px below |
| Nav item | Raleway | 14 / 25.06 | 400 | centred row; active `#191919` |
| Hero heading | Playfair Display | 36 / 63 | 700 | white, on a `rgba(0,0,0,.3)` panel |
| Hero subheading | Playfair Display | 32 / 56 | 400 italic | white |
| Section heading (About, News & Highlights) | Playfair Display | 30 / 48 | 400 | |
| Body (About) | Lato 300 | 20 / 32 | 300 | |
| Theme title | Playfair Display | 20 / 32 | 700 | |
| News headline (Home) | Playfair Display | 22 / 31.5 | 700 | |
| News body (Home) | Lato 300 | 20 / 28.2 | 300 | the cited-article item is 17 / 24 |
| CONTACT US | Playfair Display | 40 / 54 | 400 | centred, uppercase as typed |
| Contact lines | Raleway | 15 / 28.1 | 400 | centred |
| Footer | Raleway | 14 / 25.06 | 400 | centred |
| Page heading (RESEARCH PROJECTS, Latest news) | Playfair Display | 35 / 47.25 | 400 | |
| Page heading (PUBLICATIONS) | Playfair Display | 40 / 54 | 400 | |
| Research project title | Lato | 22 / 31 | 700 | |
| Research project body | Lato 300 | 20 / 31 | 300 | figures centred, about 600–708px wide |
| News page item | Lato 300 | 22 / 31 | 300 | |
| Publication title | Playfair Display | 20 / 31 | 400 | |
| Publication authors | Playfair Display | 16–17 / 24–31 | 400 | |
| Citation and DOI lines | Didot italic → Bodoni Moda italic | 16 / 28 | 400 italic | DOI is a black link, no underline |
| "Our Team" | Playfair Display | 56 / normal | 400 | centred |
| Team intro | Raleway | 15 / 28.1 | 400 | centred, about 930px wide |
| Person name | Playfair Display | 20 / 27.5 | 400 | centred; photo about 196×200–235 |
| Person role | Didot italic → Bodoni Moda italic | 16 / 28 | 400 italic | centred, 1–2 lines |
| "Lab Alumni" | Playfair Display | 40 / 54 | 400 | |
| Alumni subtitle | Didot italic → Bodoni Moda italic | 20 / 33.4 | 400 italic | |
| Name row (alumni, interns) | Playfair Display | 22 / 31 | 400 | centred; qualifier Playfair 16 italic, inline |
| Media title | Playfair Display | 22 | 400 | outlet italic; the video row's title is 30 |
| Contact page intro | Raleway | 25 / 47 | 400 | centred |

Mobile at a 320px Wix canvas (we render fluid):

| Element | Font | Size / line height | Notes |
|---|---|---|---|
| Site title | Playfair Display | 19 / 25.65 | left-aligned, hamburger right |
| Hero heading | Playfair Display | 23 / 40.25, 700 | |
| Hero subheading | Playfair Display | 22 / 38.5, italic | |
| Section heading | Playfair Display | 21 / 33.6 | "News & Highlights" is 31 |
| Body | Lato 300 | 15 / 24 | |
| News headline / body | Playfair Display 18 bold / Lato 300 17 | | |
| CONTACT US | Playfair Display | 28 / 37.8 | |
| Footer | Raleway | 12 / 21.5 | |
| Mobile menu item | Proxima Nova → Montserrat | 16 / 22.4 | centred on `#bfbfbf`, dividers, about 42px rows |
| Team | single column | photo 140px wide | name and role centred |
