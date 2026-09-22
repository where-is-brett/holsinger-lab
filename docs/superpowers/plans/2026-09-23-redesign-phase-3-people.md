# Redesign Phase 3 step 2, PR B — People: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/people` and `/people/[slug]` from the redesign primitives, per `agreed-ia.md` §3 "People" and the vendored `ui_kits/site/People.jsx`. Both pages must look right against today's production data and against the Wix-import shape: about 42 profiles, most imported alumni/interns without photos, `roleDetail` on many, and `settings.labHead` set.

**Architecture:** A pure `components/redesign/peopleModel.ts` does the grouping. It moves the existing tested helpers there and adds initials, the alumni split and member counting. `PersonCard` gains `detail` and `href`. It also exports its portrait frame, so the lab-head spotlight uses the same 4:5 portrait or initials treatment. One server screen, `components/redesign/screens/People.tsx`, renders the page; a gallery fixture proves the states that production data can't show today.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Sanity (`@portabletext/react`, `@sanity/image-url`), Vitest (node, `**/*.test.ts`), Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` §1, §2 (rulings 2 and 3) and §5. Read those first.

## Global Constraints

- Branch `redesign/phase-3-people` off `redesign/integration` at `2c0758c`. The PR goes into `redesign/integration`. Never touch `main` or another checkout.
- **No new dependencies.** No `cn()`, `clsx` or `tailwind-merge`.
- **Two Tailwind utilities setting the same CSS property on one element at the same breakpoint never merge.** The later-generated one wins silently. Use responsive pairs (one unprefixed utility plus one `md:`/`lg:` utility), or pick one of two whole class strings.
- **Tailwind 4 arbitrary values:** write `h-(--x)` when the custom property is the whole value, and an explicit `var()` inside composites.
- **Empirical CSS proof for every new utility:** `npm run css:proof -- --grep '<declaration>'` must exit 0.
- **CMS text prints verbatim:** names, `role`, `roleDetail`, emails. Never uppercase or "correct" them. `uppercase` goes on labels only.
- **Every e2e assertion must hold for any valid dataset,** today's production and the Wix-import shape alike. Derive expectations from `e2e/support/sanity.ts`'s `e2eClient` (read-only live GROQ) or from the page itself. Content-shaped states that the live data can't show go on the gallery fixture at `/preview/components`.
- **Before any local e2e or build:** `rm -rf .next/cache/fetch-cache`. It serves stale Sanity data across local builds. Then confirm `lsof -i :3000` is empty and stays empty: a previous run's server can take seconds to exit. Leave nothing running on :3000.
- **Lint baseline:** 0 errors, 4 warnings. Any new warning is a regression.
- **Do not touch:** any schema, `menuItems`, the show* flags, `project`, `home.*`, `siteCopy`, or the Home page (PR C).
- **Width checks:** no horizontal overflow at 320, 375, 768, 1024 and 1280px on every route this PR changes. `html { overflow-x: hidden }` hides overflow, so measure `document.documentElement.scrollWidth <= clientWidth`, never computed clipping.
- **Commit messages:** conventional prefix, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

1. **`settings.labHead` set but without a portrait or email** (the PI today, and on wix-preview). The spotlight renders the initials frame, the name and the bio, with no empty email line. The PI is not duplicated in the member grid. Pinned by Task 2's gallery fixture and e2e.
2. **`settings.labHead` unset.** No spotlight. The PI profile, which has no roleGroup, still appears exactly once, in the trailing ungrouped section. Pinned by Task 2's live-derived e2e.
3. **A large, mostly photo-less alumni and intern population.** Alumni render as one inline list rather than 27 empty portrait frames. Interns render initials frames with the country in `role` verbatim. No overflow at 320px. Pinned by Task 2's gallery fixture (at least 20 alumni, 10 photo-less interns).
4. **A profile whose `roleGroup` reference dangles, or is unset.** It lands in the ungrouped section and never disappears. Pinned by Task 1's unit tests.
5. **Names that yield awkward initials:** a single word, a hyphenated name, extra whitespace, a non-Latin first letter. Pinned by Task 1's `initialsOf` tests.

---

### Task 1: `peopleModel.ts`, `PersonCard` additions, query field

**Files:**
- Create: `components/redesign/peopleModel.ts`, `components/redesign/peopleModel.test.ts`
- Move (with `git mv`, then merge into `peopleModel.ts` and delete the originals): `components/pages/people/{groupByRoleGroup,excludeLabHead,shouldShowLabHeadSpotlight}.ts` and their `.test.ts` files. Their tests move into `peopleModel.test.ts` unchanged apart from import paths.
- Modify: `components/redesign/PersonCard.tsx`, `lib/sanity.queries.ts` (add `roleDetail` to `profileQuery`, `profileBySlugQuery` and `settingsQuery.labHead`), and regenerate the types with `npm run typegen`.
- Modify imports wherever the moved helpers were used (`components/pages/people/People.tsx`, `Spotlight.tsx`, etc.). The old People page keeps working until Task 2.

**Interfaces (produced):**
```ts
// peopleModel.ts
export interface RoleGroupSection<T> { id: string; title: string | null; profiles: T[] }   // moved as-is
export function groupByRoleGroup<T extends { roleGroup?: { _id: string; title: string | null } | null }>(profiles: T[], roleGroups: { _id: string; title: string | null }[]): RoleGroupSection<T>[]  // moved as-is
export function excludeLabHead<T extends { _id: string }>(profiles: T[], labHeadId?: string | null): T[]  // moved as-is (keep its existing signature exactly)
export function shouldShowLabHeadSpotlight(settings: { labHead?: { _id: string } | null; showLabHeadOnPeople?: boolean | null }): boolean  // moved as-is
export function initialsOf(name: string | null | undefined): string
export function isAlumniGroup(title: string | null | undefined): boolean
export function splitAlumni<T>(sections: RoleGroupSection<T>[]): { members: RoleGroupSection<T>[]; alumni: T[] }
export function memberCount<T>(sections: RoleGroupSection<T>[]): number
```
```ts
// PersonCard.tsx
export interface PersonCardProps { name: string; role: string; detail?: string | null; img?: string; initials?: string; href?: string | null }
export function PortraitFrame(props: { name: string; img?: string; initials?: string; sizes: string; className?: string }): JSX.Element
```

Behaviour:

- **`initialsOf`:**
  - Take the first letter of the first word and the first letter of the last word, uppercased.
  - A single word gives one letter.
  - Trim and collapse whitespace first.
  - A hyphenated word counts as one word ("Mary-Jane Lee" → "ML").
  - Use code points (`Array.from`) so a non-BMP first character stays whole.
  - Empty, null or whitespace-only input gives `''`.
  - Tests:

    | Input | Output |
    |---|---|
    | `'Jiyoo Choi'` | `'JC'` |
    | `'  Damian   Holsinger '` | `'DH'` |
    | `'Plato'` | `'P'` |
    | `'Mary-Jane Lee'` | `'ML'` |
    | `'Élodie Ñúñez'` | `'ÉÑ'` |
    | `''` | `''` |
    | `null` | `''` |
    | `'Fritz A. Graham'` | `'FG'` |

- **`isAlumniGroup`:** `true` when the trimmed, lowercased title contains `alumni`. Tests: `'Lab Alumni'`, `'alumni'`, `' Recent Lab Alumni '` → `true`; `'Research Scientist'`, `null` → `false`.
- **`splitAlumni`:**
  - Every section whose title passes `isAlumniGroup` has its profiles concatenated into `alumni`, in section order.
  - `members` is the remaining sections, order preserved.
  - Tests: an alumni group in the middle, no alumni group, and two alumni groups.
- **`memberCount`:** the total profiles across `members`.
- **`PersonCard`:**
  - `detail` renders as a second mono line under `role`, verbatim, and only when non-empty.
  - When `href` is set, the card is wrapped in `next/link` with an accessible name equal to the person's name. The image `alt` is the name, so only one name is announced: set the link's `aria-label` to the name and give the image `alt=""` in that case. Say in the report which you did and why.
  - `PortraitFrame` is the existing image and initials-fallback footprint, extracted verbatim, with `sizes` as a prop. `PersonCard` uses it.
  - The initials fallback's `[ NO PORTRAIT ON FILE ]` label stays.
- **Gallery:** `app/preview/components/Gallery.tsx`'s PersonCard section gains one card with `detail` and one with `href`.

- [ ] **Step 1:** `git mv` the three helpers into place: merge them into `peopleModel.ts` and their tests into `peopleModel.test.ts`. Update the importers. Run `npm test`: green, same count.
- [ ] **Step 2:** Write the failing tests for `initialsOf`, `isAlumniGroup`, `splitAlumni` and `memberCount`, and run them red.
- [ ] **Step 3:** Implement. Run the tests green.
- [ ] **Step 4:**
  - Add `roleDetail` to the three query projections and run `npm run typegen`, which must stay clean. Fix any type fallout, including fixtures such as `lib/json-ld.test.ts`'s profile builders, if they are typed from the payload.
  - Update `PersonCard` and the gallery.
  - CSS-proof every new utility.
- [ ] **Step 5:** Run `npm run type-check && npm run lint && npm test && npm run test:e2e -- e2e/redesign-components.spec.ts` (after clearing the fetch cache, with :3000 free).
- [ ] **Step 6:** Commit: `feat: people model, PersonCard detail/link, roleDetail in profile queries`.

---

### Task 2: The `/people` screen

**Files:**
- Create: `components/redesign/screens/People.tsx`, `e2e/people.spec.ts`
- Modify:
  - `app/people/page.tsx`: render `<Layout settings={settings} childrenStyles="px-0"><JsonLd …/><People … /></Layout>` in the page, moving the `Layout` out of the old component.
  - `app/preview/components/Gallery.tsx` and `components/redesign/fixtures.ts`: add the People fixtures.
  - `e2e/lab-head-spotlight.spec.ts`: new markup. Keep its live-data branching.
  - `e2e/redesign-components.spec.ts`
  - `e2e/publications-interactive.spec.ts`: **delete** its "People role grouping" describe; `people.spec.ts` supersedes it. Also apply the carried PR A fix: in the DOI/URL partition test, assert that every `data-link-kind="DOI"` row has exactly one `[data-identifier]` link, i.e. `doiHrefs.length === doiCount`.
  - `components/pages/interactive-elements-contract.test.ts`: remove the `Profile.tsx` case. If no cases remain, delete the file, and say so in the report.
- Delete: `components/pages/people/{People,Profile,Spotlight,ContactLinks}.tsx`. **Keep `PersonBio.tsx`**: Task 3 replaces it.

**Screen props:**
```ts
People({ settings, profiles, roleGroups }: { settings: SettingsPayload; profiles: ProfilePayload[]; roleGroups: RoleGroupPayload[] })
```
It is a server component.

Composition follows `ui_kits/site/People.jsx`. Content follows the IA. Blocks are numbered in render order, with no gaps:

1. **`PageTitle "People"`.**
   - Meta: `` `${spotlight ? 'LAB HEAD + ' : ''}${n} CURRENT MEMBERS · ${g} GROUPS` ``, where `n = memberCount(members)` and `g` = the number of member sections. The trailing ungrouped section counts as a group only if it has a title.
   - Use `1 GROUP` and `1 CURRENT MEMBER` for singulars.
2. **"Lab head"**, only when `shouldShowLabHeadSpotlight(settings)`:
   - **Layout:** from `md`, a two-column grid with a 220px portrait column; stacked below `md`, with the portrait capped at 220px wide.
   - **Portrait:** `PortraitFrame` at a 4:5 crop. The image URL is `urlForImage(image)?.width(440).height(550).fit('crop').url()`, which respects the hotspot. When there is no image, use initials from `initialsOf(name)`.
   - **Label:** `Head of laboratory · Principal investigator`, in mono caps, faint.
   - **Name:** an `h2`.
   - **Bio:** `fullBio`, falling back to `bio` (portable text). Render it with `@portabletext/react`'s `PortableText`, using a minimal `components` map: paragraphs in the ui_kit's muted body style, and links as `hl-link`-style underlined links. Omit the bio when both fields are empty.
   - **Email:** only when set, as a `mailto:` identifier (`data-identifier`, verbatim).
   - **Profile link:** when `hasPage` and `slug` are set, a mono link `Full profile →` to `/people/<slug>`.
3. **"Members":** for each member section:
   - a heading row: the title, in mono caps, plus its count in link colour. A section with no title (the only-section ungrouped case) has no heading.
   - then a grid: `grid-cols-2` below `md`, `md:grid-cols-3`, `lg:grid-cols-6`, gap as in the ui_kit.
   - Each profile is a `PersonCard`:
     - `name`, `role` (`''` when null) and `detail={roleDetail}`, all verbatim;
     - `img` = `urlForImage(image)?.width(400).height(500).fit('crop').url()`;
     - `initials = initialsOf(name)`;
     - `href` = `/people/<slug>` when `hasPage` and `slug` are set.
   - The lab head is excluded from these sections only when the spotlight renders. Use `excludeLabHead` with the labHead id **only if** `shouldShowLabHeadSpotlight` is true; otherwise the PI appears in its section.
4. **"Alumni":** only when `alumni.length > 0`.
   - A mono-caps label, `Recent lab alumni`.
   - A `<p>` with the alumni's names joined by `, `. Each name links to `/people/<slug>` when `hasPage`.
   - Names are verbatim; no roles, years or degrees (IA §6.5).
   - The paragraph wraps naturally.

Gallery fixture (`gallery-people`), rendering `<People>` twice from `fixtures.ts`:

- **(a) Lab head set, no portrait, no email, a two-paragraph portable-text `fullBio`, `hasPage: true`.** Plus these sections:
  - Research Scientist: two members, with photos. For photos, reuse the existing fixture image URLs that `SAMPLE_PEOPLE` uses.
  - International Interns: 10 members, no photos. Every `role` includes a country, e.g. `'Visiting Intern — Germany'`, and 3 have a `roleDetail`.
  - Lab Alumni: 22 members, no photos.
  - Two ungrouped profiles.
- **(b) Lab head unset, and the same people.**

Headings from the two instances must not collide for axe. If `PageTitle`'s `h1` duplicates the gallery's own `h1`, wrap the instances so axe is satisfied (e.g. render them inside a container that axe excludes, or add a `headingLevel` prop to `PageTitle`), and justify the choice in the report.

e2e:

- **`e2e/people.spec.ts`**, using `e2eClient` for the expectations:
  - Every profile that should render on `/people` appears **exactly once**: either as a `PersonCard` in Members, as a name in Alumni, or as the spotlight.
  - Member section headings appear in `roleGroup` `orderRank` order, skipping alumni groups.
  - Alumni names appear in the alumni paragraph, in the group's order.
  - The spotlight is present exactly when `labHead` is set and `showLabHeadOnPeople !== false`.
  - The meta's member count equals the number of rendered cards.
  - No overflow at 320, 375, 768, 1024 or 1280px.
- **Gallery** (`e2e/redesign-components.spec.ts`):
  - Instance (a) shows the spotlight with an initials frame, the name, both bio paragraphs, no `mailto:` link and a `Full profile →` link; the lab head's name does not appear among (a)'s cards.
  - The alumni paragraph in (a) contains 22 comma-separated names.
  - Intern cards show their `role` text verbatim, including the country.
  - Instance (b) has no spotlight.
  - No page overflow at 320px.
- **`e2e/lab-head-spotlight.spec.ts`:** update selectors to the new markup. Keep every live-data branch, and keep the Home lab-head-card test untouched (Home is PR C).
- **`e2e/axe.spec.ts`:** `/people` is already listed. Confirm it passes.

- [ ] **Step 1:** Write the e2e changes first, and run them red against the old page.
- [ ] **Step 2:** Implement the screen, page and fixtures, and delete the old components.
- [ ] **Step 3:** CSS proof for every new utility. Audit the same-property rule per breakpoint.
- [ ] **Step 4:** Run `npm run type-check && npm run lint && npm test && npm run build`, then the FULL `npm run test:e2e` (fetch cache cleared, :3000 free). Report exact counts.
- [ ] **Step 5:** Commit: `feat: rebuild /people on the redesign primitives`.

---

### Task 3: `/people/[slug]`

**Files:**
- Create: `components/redesign/screens/PersonPage.tsx`
- Modify: `app/people/[slug]/page.tsx`, `e2e/lab-head-spotlight.spec.ts` (the person-page test, if it asserts on markup), `e2e/axe.spec.ts` (add a person path, derived at runtime if the spec's structure allows it; otherwise add `/people/damian-holsinger` with a comment that `hasPage` is set on that profile, and skip it if the profile disappears)
- Delete: `components/pages/people/PersonBio.tsx`, and the now-empty `components/pages/people/` folder if nothing remains.

**Screen:** `PersonPage({ person }: { person: ProfileBySlugPayload })`, a server component. `page.tsx` keeps its fetch, metadata, JSON-LD and `notFound`, and renders `<Layout settings={settings} childrenStyles="px-0"><JsonLd …/><PersonPage person={profile} /></Layout>`.

1. **`PageTitle` with `title={name}`:**
   - `meta` = `role`, plus ` · roleDetail` when set, verbatim.
   - `PageTitle` renders `meta` as given. If it uppercases via CSS, that's acceptable only because the meta line is a label: note this in the report, and keep `role`'s DOM text verbatim.
2. **A `SectionRail` "Profile":**
   - From `md`, a two-column grid: the portrait (`PortraitFrame`, 4:5, 220px, initials fallback) and the text column.
   - The text column holds the bio (`fullBio`, else `bio`, through the same `PortableText` component map as Task 2; extract it to `components/redesign/PortableBody.tsx` so both screens share it), then `email` / `phone` as identifiers when set.
   - Stacked below `md`.
3. **A `← All people` link** to `/people`, at the top of the rail, styled like the paper page's back link.

e2e:
- For every profile with `hasPage == true` (live query), the page renders its name as the `h1`.
- The back link goes to `/people`.
- There is no overflow at 320 and 375px.
- The existing 404 tests keep passing.

- [ ] **Step 1:** Write the e2e first and run it red.
- [ ] **Step 2:** Implement, including the `PortableBody` extraction; Task 2's screen switches to it.
- [ ] **Step 3:** CSS proof, and verify: `type-check`, `lint`, `test`, `build`, and the full `test:e2e` (fetch cache cleared, :3000 free).
- [ ] **Step 4:** Commit: `feat: person pages on the redesign primitives`.

---

### Task 4: Docs, and the parked PR A wording

**Files:**
- Modify: `docs/redesign-experiment/phase-3-decisions.md`, `docs/redesign-experiment/phase-3-start-here.md`, `docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md` (§4.2 only)

- [ ] **Step 1:** Fix the carried stale wording. `phase-3-decisions.md` (around the FacetBand paragraph) and spec §4.2 still say FacetBand is sticky "from `lg`". It is now sticky only at min-width 64rem **and** min-height 56rem, per PR A's final-review ruling. Make that a one-line correction in each file.
- [ ] **Step 2:** Add a "Step 2 — PR B (People)" section to `phase-3-decisions.md`, covering:
  - the spotlight rules (unset / set / no portrait);
  - the alumni inline list and how the alumni group is identified (a title containing "alumni");
  - the photo-less design;
  - `roleDetail`;
  - `PortableBody`;
  - the deleted components;
  - the gallery fixture's wix-preview shape;
  - the verification table with the real numbers from Task 3's final run.
- [ ] **Step 3:** In `phase-3-start-here.md`, mark PR B done-pending-review.
- [ ] **Step 4:** Commit: `docs: Phase 3 step 2 PR B decisions`.
