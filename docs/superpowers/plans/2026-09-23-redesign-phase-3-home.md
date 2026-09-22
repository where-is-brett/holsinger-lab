# Redesign Phase 3 step 2, PR C — Research, Resources, Home: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/resources` and `/research`, and rebuild `/` (Home) from the redesign primitives, per `agreed-ia.md` §3 and the vendored `ui_kits/site/{Home,Research}.jsx`. Turn the Research and Resources nav items on. Everything must render honestly for today's production data (zero resources, no `researchOrder` set, `labHead` unset) and for the Wix-import shape (4 research projects with `researchOrder`, `labHead` set, `settings.contact` filled in).

**Architecture:** One server screen per route, in `components/redesign/screens/`. Query projections sit next to the existing ones in `lib/sanity.queries.ts`. Pure helpers are unit-tested: the research kicker, the contact-email resolution, and the Home member count. Gallery fixtures prove the states production can't show today.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Sanity (`@portabletext/react`, `@sanity/image-url`), Vitest (node, `**/*.test.ts`), Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` §1, §2 (rulings 1 and 4, the `researchOrder` and `maestro` rows) and §6. Read those first. Also read the `phase-3-decisions.md` sections for PR A and PR B, which set the conventions this PR follows.

## Global Constraints

- Branch `redesign/phase-3-home` off `redesign/integration` at `30fdd40`. The PR goes into `redesign/integration`. Never touch `main` or another checkout.
- **No new dependencies.** No `cn()`, `clsx` or `tailwind-merge`.
- **Two Tailwind utilities setting the same CSS property on one element at the same breakpoint never merge.** Use responsive pairs, or pick one of two whole class strings.
- **Tailwind 4 arbitrary values:** `h-(--x)` when the custom property is the whole value; an explicit `var()` inside composites.
- **Empirical CSS proof for every new utility:** `npm run css:proof -- --grep '<declaration>'` must exit 0.
- **CMS text prints verbatim:** titles, tags, emails, URLs and portable text. That includes the `maestro` project's title and its typo ("endevor"). Never "correct" content in code. `uppercase` goes on labels only.
- **Every e2e assertion must hold for any valid dataset.** Derive expectations from `e2e/support/sanity.ts`'s `e2eClient` or from the page. States the live data can't show go on gallery fixtures at `/preview/components`.
- **No horizontal overflow** at 320, 375, 768, 1024 and 1280px on every route this PR adds or changes. Measure `document.documentElement.scrollWidth <= clientWidth`; `html { overflow-x: hidden }` hides overflow otherwise. A CSS grid item that holds text needs an explicit track (`grid-cols-1` below the breakpoint that introduces columns, which compiles to `minmax(0,1fr)`). Otherwise one unbreakable token (an email, a DOI) sets the track's min-content width, and the grid overflows. Text that can hold long tokens gets `break-words`.
- **Before any local e2e or build:** `rm -rf .next/cache/fetch-cache` (it holds stale Sanity data). Then confirm `lsof -i :3000` is empty and stays empty. Leave nothing running on :3000.
- **Lint baseline:** 0 errors, 4 warnings. Any new warning is a regression.
- **Do not touch:** any schema; the `menuItems` or show* schema; `home.showcaseProjects`; `siteCopy`; the `/projects/[slug]` route. Retiring `project` is step 4 and out of scope. Read-only use of `project` documents is expected.
- **Images:** use `urlForImage` from `lib/sanity.image.ts` with explicit dimensions. Research covers keep their own aspect ratio and are **never cropped**: use the asset's `metadata.dimensions`.
- **Commit messages:** conventional prefix, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

1. **Zero of something.** Zero resources: `/resources` shows its empty line and Home has no Resources block. Zero `researchOrder` projects: `/research` shows its empty state and the numbering stays gap-free. No `maestro` document: no MAESTRO block. No `labHead`: no PI panel and no PI in "The lab". All four are true in production today. Pinned in each task's live-derived e2e.
2. **Four or more research projects with covers of wildly different aspect ratios** (0.9, 1.05, 1.4, 2.05, plus one with no cover): no cropping, no overflow at 320px, and a readable narrative column. Pinned by Task 2's gallery fixture.
3. **Contact email resolution:** `settings.contact.email`, then `labHead.email`, then none. With none, the enquiry line links to `/contact`, or offers no link at all when `showContactForm === false`. Pinned by Task 2's unit tests.
4. **The `maestro` project's content is used verbatim,** typo included, and the register link is the document's `site`. Pinned by Task 3's live-derived e2e.
5. **Revalidation:** editing a `resource`, `project`, `profile` or `roleGroup` must refresh every route that reads it. Pinned by the revalidate route's unit test (Task 3).

---

### Task 1: `/resources`

**Files:**
- Create: `components/redesign/screens/Resources.tsx`, `app/resources/page.tsx`, `e2e/resources.spec.ts`
- Modify:
  - `components/redesign/ResourceBlock.tsx`: an optional `children` body below the meta list, for the summary and how-to-obtain text. Keep its existing props, and keep the responsive rules added in PR A.
  - `lib/sanity.queries.ts`: `resourcesQuery` also projects `publication->{…, journal, volume, issue, pages}`, and `howToObtain` stays portable text.
  - `components/redesign/navModel.ts` and its test: `resources` becomes `live: true`.
  - `lib/paths.ts`: `/resources` added to the static paths.
  - `app/preview/components/Gallery.tsx` and `components/redesign/fixtures.ts`: a `gallery-resources` fixture with 2 resources, one with a linked publication and a portable-text `howToObtain` holding a link.
  - `e2e/axe.spec.ts`: add `/resources`.

**Screen:** `Resources({ resources }: { resources: ResourcesQueryResult })`, a server component.

1. **`PageTitle "Resources"`.** Meta: `` `${n} RESOURCE${n === 1 ? '' : 'S'}` ``.
2. **One `SectionRail` per resource,** numbered in order, with the label set to the resource's `kind` (verbatim, mono caps).
   - Inside it, a `ResourceBlock` with:
     - `title`;
     - `meta`: `KIND` (kind); `SOURCE` (the linked publication's `journal ref · year`, `href` `/publications/<slug>`, only when a publication is linked); and `DOI` or `URL`, whichever the linked publication has, with the full href and verbatim label;
     - no `figureLabel` (there are no images in the schema).
   - The block's `children`: `summary` as a `<p>`, then `howToObtain` through `PortableBody` (the component PR B created).
3. **Empty state:** a single `SectionRail` holding "No resources are listed yet." Nothing else.

`app/resources/page.tsx`:
- same shape as `app/publications/page.tsx`: `revalidate = 60`, `stega: false` fetches for metadata;
- `buildMetadata` with the title "Resources" and a generic description;
- `<Layout settings={settings} childrenStyles="px-0">`.
- The route is never a 404. It has no show* flag.

e2e (`e2e/resources.spec.ts`), using `e2eClient`:
- the page renders one block per `resource` document, or the empty line when there are none;
- each linked publication's SOURCE link goes to `/publications/<slug>`;
- no overflow at the five widths;
- the gallery fixture renders both resources, the portable-text link, and no overflow at 320px.

- [ ] **Step 1:** Write the e2e and the navModel test change first, and run them red.
- [ ] **Step 2:** Implement, then CSS-proof.
- [ ] **Step 3:** Run `type-check`, `lint`, `test`, `build`, and the full `test:e2e` (fetch cache cleared, :3000 free). Report exact counts.
- [ ] **Step 4:** Commit: `feat: /resources on the redesign primitives`.

---

### Task 2: `/research`

**Files:**
- Create:
  - `components/redesign/screens/Research.tsx`
  - `components/redesign/researchModel.ts` + `researchModel.test.ts`
  - `app/research/page.tsx`
  - `e2e/research.spec.ts`
- Modify:
  - `lib/sanity.queries.ts`:
    - new `researchProjectsQuery`: `*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) { _id, title, "slug": slug.current, overview, coverImage{..., asset->{_id, metadata{dimensions{width, height, aspectRatio}}}}, "start": duration.start, tags, category }`;
    - `settingsQuery` gains `contact{ email }`;
    - run typegen.
  - `components/redesign/navModel.ts` + test: `research` becomes `live: true`.
  - `lib/paths.ts`: add `/research`.
  - `app/preview/components/Gallery.tsx` + `fixtures.ts`: a `gallery-research` fixture with 5 projects:
    - 4 with covers at aspect ratios 0.90, 1.05, 1.40 and 2.05;
    - 1 with no cover;
    - one with a long unbreakable token in its overview;
    - one with no tags;
    - one with no `start`.
    - Use existing fixture image URLs, or a plain placeholder served from `/public` if one exists; don't add new binary assets unless no image fixture exists.
  - `e2e/axe.spec.ts`: add `/research`.

**Interfaces:**

```ts
// researchModel.ts
export function researchKicker(p: { start?: string | null; category?: string | null }): string
// 'Since 2023 · Non-pharmacological interventions' | 'Since 2018' | 'Non-pharmacological interventions' | ''
export function enquiryEmail(settings: { contact?: { email?: string | null } | null; labHead?: { email?: string | null } | null }): string | null
// trimmed contact.email, else trimmed labHead.email, else null
```

Unit tests: every branch of both functions, including whitespace-only emails, which count as missing.

**Screen:** `Research({ projects, email, showContactForm })`, a server component, composed after `ui_kits/site/Research.jsx`.

1. **`PageTitle "Research"`.** Meta: `` `${n} ACTIVE PROJECT${n === 1 ? '' : 'S'}` ``.
2. **One `SectionRail` per project,** in order. The label is the first tag, or "Project" when there are no tags. Each narrative has:
   - **Kicker:** `researchKicker(...)`, plus ` — ` and the tags joined with ` · ` in link colour, omitting whichever part is empty.
   - **`h2` title.** Verbatim.
   - **Overview:** `overview` through `PortableBody`, lead-size paragraphs.
   - **Cover:** when present, shown at its intrinsic ratio: `next/image` with `width`/`height` from `metadata.dimensions`, `sizes` fitting the column, `className` `h-auto w-full`, alt text equal to the title.
     - It sits in a 380px right column from `lg`, stacked above or below the text before that.
     - With no cover, the narrative uses the full width, with no placeholder box. The ui_kit's hatched box is mockup text.
3. **"Enquiries" `SectionRail inverse`:**
   - "Student and collaboration enquiries are welcome —", then the email as a `mailto:` identifier when `enquiryEmail` returns one.
   - Otherwise, when `showContactForm !== false`, a link "get in touch" → `/contact`.
   - Otherwise the sentence ends at "welcome.".
   - No "example wording" footnote: that is mockup text.
4. **Empty state, when `projects.length === 0`:** the title's meta reads `0 ACTIVE PROJECTS`. One rail says "Research projects will be listed here soon.", and the Enquiries band still renders.

`app/research/page.tsx`: the same shape as the resources page. `email = enquiryEmail(settings)`.

e2e (`e2e/research.spec.ts`), using `e2eClient`:
- the rendered `h2`s equal the titles of the `defined(researchOrder)` projects, in `researchOrder` order, or the empty-state line appears;
- every rendered cover's natural aspect ratio matches its `<img>` box within 2%, i.e. not cropped;
- the enquiry line's link matches `enquiryEmail` of the live settings, or `/contact`;
- no overflow at the five widths;
- gallery fixture: all 5 projects render, no cover is cropped, and the page doesn't overflow at 320px.

- [ ] Steps as in Task 1: write the tests first and run them red, implement, CSS-proof, run the full verification, and commit `feat: /research lists researchOrder projects on the redesign primitives`.

---

### Task 3: Home

**Files:**
- Create: `components/redesign/screens/Home.tsx`, `components/redesign/homeModel.ts` + `homeModel.test.ts`, `e2e/home.spec.ts`
- Modify:
  - `app/page.tsx`: fetch everything Home needs in one `Promise.all`. Keep `generateMetadata` exactly as it is.
  - `lib/sanity.queries.ts`: new queries, then typegen:
    - `homeRecentPublicationsQuery`: `*[_type == "publication"] | order(date desc)[0...5] { ${publicationFields} }`
    - `publicationCountQuery`: `count(*[_type == "publication"])`
    - `homeResourceQuery`: `resourcesQuery`'s projection, `[0]`
    - `maestroProjectQuery`: `*[_type == "project" && slug.current == "maestro"][0]{ _id, title, overview, site }`
    - `supportPageQuery`: `*[_type == "page" && slug.current == "support-our-research"][0]{ title, "slug": slug.current }`
  - `app/api/revalidate/route.ts` + its test:
    - `resource` → `/resources`, `/`, and `/publications/[slug]` (page);
    - `project` also → `/research`;
    - `profile` also → `/`;
    - a new `roleGroup` case → `/people` and `/`;
    - `page` also → `/` (the Support link).
  - `e2e/lab-head-spotlight.spec.ts`: the Home lab-head test is retargeted to the new markup, with its live-data branching kept.
  - `e2e/image-geometry.spec.ts`:
    - retarget "image frames are dimmed in dark mode only" to a route that still renders `.media-frame`: resolve the first `project` slug with a `coverImage` via `e2eClient` and use `/projects/<slug>`, skipping with a reason if there is none;
    - remove `/` from the undistorted-images `ROUTES` if Home no longer renders images in those frames. Keep `/people`, and say what you did in the report.
  - `e2e/redesign-components.spec.ts`:
    - fix the stale comment (around lines 284–289) that still refers to the removed `aria-label` on linked PersonCards;
    - add the carried assertion: in the People gallery instance, the number of `people-section-title` elements equals the meta's group count.
  - `app/preview/components/Gallery.tsx` + `fixtures.ts`: a `gallery-home` fixture with `labHead` set (no portrait), 1 resource, a `maestro` project and a support page. The recent-work rows use `SAMPLE_PUBLICATIONS`, or a fixture through `toPublication`.
- Delete:
  - `components/pages/home/{HomePage,FeatureRow,ProjectListItem}.tsx` and `feature-row-contract.test.ts`;
  - move `shouldShowLabHeadCard` and `resolveLabHeadHref`, with their tests, into `homeModel.ts` / `homeModel.test.ts`, unchanged apart from imports;
  - `components/shared/Header.tsx` only if nothing else imports it (it is used by `Page.tsx` and `ProjectPage.tsx`, so it probably stays).

**`homeModel.ts` interfaces:**

```ts
export function shouldShowLabHeadCard(...)  // moved as-is
export function resolveLabHeadHref(...)     // moved as-is
export function currentMemberCount(profiles: { _id: string; roleGroup?: { _id: string; title: string | null } | null }[], roleGroups: { _id: string; title: string | null }[], labHeadId: string | null | undefined): number
// profiles not in an alumni group (isAlumniGroup from peopleModel), excluding labHeadId
export function plainTagline(overview: unknown): string | null
// portable text → trimmed plain text (toPlainText), null when empty
```

Unit-test every function. `currentMemberCount` needs: the alumni group excluded; the lab head excluded only when an id is passed; ungrouped profiles counted.

**Screen:** `Home(props)`, a server component, composed after `ui_kits/site/Home.jsx`. Blocks are numbered in render order and omitted when there's nothing to show:

1. **"Identity":**
   - a rule plus "The University of Sydney" in mono caps;
   - `h1` = `home.title`, falling back to `siteName`;
   - tagline = `plainTagline(home.overview)`, falling back to the IA text "Advancing the Understanding and Treatment of Neurological Disorders through Molecular Research".
   - When the PI card shows (`shouldShowLabHeadCard(settings) && labHead`), a PI panel: the label "Principal investigator", the name (linked via `resolveLabHeadHref`), and the email identifier when set.
   - From `lg`, the tagline and PI panel sit in the ui_kit's two-column grid; stacked below.
2. **"Recent work":**
   - the column heads from `lg` only, as on the index;
   - up to 5 `PublicationRow variant="home"` rows, each with `href`;
   - then the link "All {count} publications →" to `/publications`.
   - Omitted when there are 0 publications. Omitted entirely when `settings.showPublications === false`.
3. **"Resources":** the first resource's `ResourceBlock` (title, `KIND`, `SOURCE` with the linked paper, and the canonical `DOI`/`URL`), plus a "All resources →" link. Omitted when there is none.
4. **"Outreach", `SectionRail inverse`:** the `maestro` project.
   - Its title, verbatim.
   - Its `overview` through `PortableBody`, styled for the inverse band. Use `text-text-inverse-muted` for the body, and make sure `PortableBody` can take an inverse variant without a same-property collision.
   - A "REGISTER — <site without scheme>" link to `site`, when `site` is set.
   - Omitted when there is no document.
5. **"The lab":**
   - **PI:** a 64px `PortraitFrame` (initials fallback) plus the name, linked. Only when the PI card shows.
   - **Current members:** `currentMemberCount(...)`, with `— PEOPLE →` linking to `/people`. Omitted when `settings.showPeople === false`.
   - **Support:** "Support our research →" to `/<support slug>`. Only when the support page exists.
   - Omitted entirely when all three parts are empty.

e2e (`e2e/home.spec.ts`), using `e2eClient`:
- the `h1` equals `home.title` (or the site name);
- the recent-work rows equal the latest `min(5, n)` publication titles in date order, each linking to its paper page, and the "All N publications" count equals the live count;
- the Resources block is present exactly when a resource exists;
- the MAESTRO block is present exactly when the `maestro` document exists, and its heading text equals that document's title verbatim;
- the member count equals `currentMemberCount` computed from live profiles, roleGroups and labHead;
- the PI panel is present exactly when `labHead` is set and `showLabHeadOnHome !== false`;
- no overflow at the five widths.
- Gallery `gallery-home`: every block renders, and no overflow at 320px.

- [ ] Steps as in Task 1: write the tests first and run them red, implement, CSS-proof, run the full verification, and commit `feat: rebuild Home as the auto-generated dashboard`.

---

### Task 4: Docs

- [ ] Add a "Step 2 — PR C (Research, Resources, Home)" section to `docs/redesign-experiment/phase-3-decisions.md`, covering:
  - the empty-state rules;
  - the `researchOrder` selector, shared with the Wix track;
  - the covers kept at their intrinsic ratio, with no placeholder box;
  - the enquiry email resolution order;
  - the MAESTRO source, verbatim title included, and **the reminder that step 4 must move the `maestro` project's content before retiring that document, or Home loses the block**;
  - Home's use of the existing `home.title` / `home.overview`, with no new editorial fields;
  - the nav: research and resources live, `lab` still off, Contact still standing in;
  - the revalidation additions;
  - the image-geometry retarget;
  - the deleted Home components;
  - the verification table (unit / lint / typegen / build / e2e), with real numbers from the final run.
- [ ] Update `phase-3-start-here.md`: step 2 complete pending review of PR C; steps 3 and 4 as they stand.
- [ ] Commit: `docs: Phase 3 step 2 PR C decisions`.
