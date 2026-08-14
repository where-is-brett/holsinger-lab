# Lab Head Spotlight & Person Pages

**Date:** 2026-08-12
**Status:** Approved; ready for planning
**Scope:** Standalone work, not a numbered phase. Independent of Phase 4 (branding customisation),
which is planned but unmerged; both add fields to the `settings` singleton, so whichever lands
second rebases onto the other (see §7).

**Governing constraint,** inherited from `2026-08-12-site-branding-customisation-design.md` because
it decides several otherwise-close calls: this site is being handed to the Holsinger Lab, and **no
one with coding skills will maintain this repo afterwards.** Anything left in code is frozen
permanently; anything editable that can be set to a broken value is a permanent hazard. Every
decision in §6 is justified against those two facts.

Every claim about live content below was verified against project `j3f9z8os` / dataset `production`
(publicly readable, no token needed for reads) on 2026-08-12.

---

## 1. Problem

"About Dr Damian Holsinger" is a **`project` document** (`_id` `775d4974-6efe-4fe8-b6b5-878b8a66cffe`,
slug `about-dr-damian-holsinger`). It is served by the research-project route at
`/projects/about-dr-damian-holsinger`, and it is the 4th entry in `home.showcaseProjects` — the array
`components/pages/home/HomePage.tsx:24-26` renders beneath the hardcoded heading **"Our Research
Projects"**. The lab's owner is presented to visitors as one of the lab's research projects.

Concrete consequences, all verified against the working tree and live data:

1. **Project furniture on a biography.** `components/pages/project/ProjectPage.tsx:59-104` renders a
   **"Duration 2016 – Now"** cell for him (his `duration.start` is `2016-07-19`) and an
   always-rendered **"Tags"** cell, which is empty because he has no tags.
2. **A validation trap that will bite the next editor.** All his prose lives in `overview`, which is
   validated `max(155)` characters (`schemas/documents/project.ts:60`). The live value is ~450
   characters — it predates that rule. The next Studio edit to this document cannot be published
   until someone truncates his biography. Meanwhile `description`, the field intended for body copy,
   holds two empty blocks.
3. **No route to him except through the research projects.** `settings.menuItems` contains only the
   `home` reference, so the nav is Home / Publications / People / Contact. The only path to the lab
   head's biography is the home page's project list.
4. **He is absent from his own lab's People page.** There is no `profile` document for him; 19
   profiles exist and none is him.

Two adjacent facts about the current data shape the design:

5. **Zero `roleGroup` documents exist in production.** All 19 profiles have `roleGroup: null`, so
   `groupByRoleGroup` (`components/pages/people/groupByRoleGroup.ts:27`) drops everyone into the
   catch-all and `/people` today renders one section headed literally **"Other"**.
6. **`profile.bio` is unused.** No profile has a `bio` value, so the `+`-button overlay
   (`components/pages/people/Profile.tsx:110`) never appears in production. The field is free to
   repurpose without touching existing content.

## 2. Goals and non-goals

**Goals**

- The lab head is presented as the lab's owner, not as a research project.
- `/people` leads with him, spotlighted above the grid of lab members.
- He keeps a home-page presence that looks like today's card, and Damian can remove or restore it
  himself.
- Any lab member can be given their own page, off by default.
- Everything above is controlled from Studio by a non-technical editor. Nothing requires a developer.

**Non-goals** — see §8 for the full list, but in particular: MAESTRO's equally wrong placement, nav
changes, and per-person publication lists are out of scope.

---

## 3. Design

### 3.1 Schema changes

**`schemas/documents/profile.ts` gains three fields.**

| Field | Type | Notes |
|---|---|---|
| `fullBio` | portable text | Paragraphs, bold/italic, and links only — no headings or lists, so the spotlight and person-page layouts stay predictable. Studio description: *"Long-form biography. Shown on this person's own page, and in the spotlight if they are set as the Lab Head in Settings."* |
| `slug` | slug | Optional. Sourced from `name`, using the repo's existing `slugify` and `validateSlugFormat` (`schemas/lib/slug.ts`) and the same `isUnique` check `project` uses. |
| `hasPage` | boolean | Default `false`. Title: *"Give this person their own page"*. Description states the URL shape (`/people/<slug>`) and that the slug is required when it is on. |

`slug` carries a validation rule: required **when `hasPage` is true**, otherwise optional. Studio
blocks publishing an enabled profile with no slug, which is what makes a dead `/people/undefined`
link impossible rather than merely unlikely.

The existing `bio` (plain `text`) keeps its current role as the **short blurb**: the card's `+`
overlay, and now the home-page card body. Two bio fields is a small editor cost, justified because
the spotlight needs paragraphs and links while cards need one or two sentences. Since no profile
uses `bio` today (§1.6), there is no migration risk.

**`schemas/singletons/settings.ts` gains two fields.**

| Field | Type | Notes |
|---|---|---|
| `labHead` | reference → `profile` | Optional. *"The lab head, shown in a spotlight at the top of the People page. Leave unset for no spotlight."* |
| `showLabHeadOnHome` | boolean | `initialValue: true`. Description written in the same explicit style as the existing `showPublications` / `showPeople` / `showContactForm` descriptions, stating that it affects **only** the home-page card and does not touch the People page or the person's own page. |

Neither field is required. The live `settings` singleton predates both, so `initialValue` will not
apply to it — the published document simply has no `showLabHeadOnHome` key until someone opens and
saves it. Consumers must therefore treat `undefined` as **on** (`!== false`, not truthiness), or the
card silently fails to appear after deploy. Making either field required would instead put the lab's
existing published document into a validation-error state.

### 3.2 `/people` — spotlight above the grid

A new `Spotlight` block renders above the existing grid when `settings.labHead` resolves:

- Large portrait on the left, **in full colour**. The grayscale-until-hover treatment
  (`Profile.tsx:75`) stays a grid-only device — it exists to make 19 heterogeneous photos look like
  a set, which is not a problem a single portrait has.
- Name, `role`, contact links (reusing the existing mail/phone icons), and `fullBio` rendered
  through `CustomPortableText`.
- Falls back to the plain-text `bio` when `fullBio` is empty; renders **nothing at all** when
  `labHead` is unset or dangles.
- When the spotlighted person has `hasPage` enabled, a "Full profile →" link. When they don't, no
  link — the biography is already fully on the page.

The spotlighted profile is removed from the grid below by a pure helper so he does not appear twice.
He remains in the page's `ItemList` JSON-LD (`buildPersonListJsonLd`), which describes the lab's
people regardless of layout.

**Related fix, in scope because it is what the redesigned page actually looks like:** with zero role
groups in production, the grid's only section is headed "Other". After the spotlight lands that
reads as "Dr Holsinger, and… Other". `groupByRoleGroup` gains a rule: when the catch-all is the only
section, its title is `null` and `People.tsx` omits the heading. Named groups are unaffected, and
the moment the lab creates its first Role Group the normal headed sections return.

### 3.3 `/people/<slug>` — person pages

A new `app/people/[slug]/page.tsx`, following `app/projects/[slug]/page.tsx`:

- `generateStaticParams` over profiles with `hasPage == true && slug.current != null`.
- `notFound()` when the slug is unknown, when the profile's `hasPage` is false, **and** when
  `settings.showPeople === false` — turning the People page off must not leave orphan person pages
  reachable.
- Renders the same presentational component as the spotlight, in a single-column arrangement:
  portrait, name, role, contact, `fullBio` — including the same fall back to the plain-text `bio`
  when `fullBio` is empty, since that behaviour lives in the shared component rather than in either
  caller.
- `generateMetadata` via `buildMetadata` — title from `name`; description is `fullBio` flattened to
  plain text and truncated at 155 characters on a word boundary, falling back to `role` when
  `fullBio` is empty; image from the profile image.
- `Person` JSON-LD: a new `buildPersonJsonLd` in `lib/json-ld.ts` reusing the existing internal
  `PersonJsonLd` shape, plus `'@context'` and the page's canonical `url`.

**Stega:** the settings and profile fetches whose values reach `<title>`, Open Graph tags, or
JSON-LD must pass `stega: false`. This is Phase 2D's recorded lesson — stega characters are
invisible, appear only in draft-mode sessions, and nothing in CI catches a mistake here.

### 3.4 Home page

Below the showcase list, a new section renders when `labHead` resolves **and**
`showLabHeadOnHome` is not false:

- Heading: `About {labHead.name}` — derived from the document, so it stays correct if the lab head
  ever changes, and no name is frozen into code.
- Card: the **same treatment as today** — the `ProjectListItem` two-column row with the image in an
  `aspect-[16/9]` frame **on the right** (mirroring his current position as the 4th, odd-indexed
  entry, `ProjectListItem.tsx:15-17`), wrapped in a bordered container matching the projects list's
  `max-w-[100rem] border-y md:border`.
- Card interior: `role` as the row title (the heading above already carries his name, so repeating
  it would be redundant) and the short `bio` as the body text.
- Links to his own page when `hasPage` is enabled, otherwise to `/people`. A pure helper resolves
  this.

His portrait keeps the hard 16:9 crop it has today. That is a deliberate choice to preserve the
current appearance; a squarer portrait frame was considered and rejected in D6.

### 3.5 Links, paths, and the sitemap

`resolveHref` (`lib/sanity.links.ts`) gains a `profile` case returning `/people/<slug>`. Because
`lib/paths.ts` builds `getAllPaths` from `resolveHref`, adding a `profilePaths` query there puts
enabled person pages into the sitemap automatically, subject to the existing `isNoindexPath` filter.

`profileQuery` gains `slug`, `hasPage`, and `fullBio`; `settingsQuery` gains `showLabHeadOnHome` and
a dereferenced `labHead->{…}` projection. Two new queries: `profileBySlugQuery` and `profilePaths`.
`npm run typegen` regenerates `sanity.types.ts` after the schema edits.

### 3.6 One shared row component

The home card and the project rows must stay visually identical, and after handover nobody can
reconcile them if they drift. So `ProjectListItem`'s layout is extracted into a presentational
`FeatureRow` (image, alt, `sizes`, side, title, children); `ProjectListItem` becomes a thin wrapper
that supplies project fields and the tag row, and the lab-head card is a second wrapper supplying
role and blurb.

The extraction must carry the measured `sizes` string and its comment across **verbatim**. Those
values were measured against real viewports, not derived from the Tailwind fractions, and the
comment is the only record of that. The same applies to the `classesWrapper` geometry — see the
PR #13 coordination note in §7, which constrains when this extraction can safely happen.

---

## 4. Content migration

Dr Holsinger's material moves out of the project document into a profile:

| From `project` `about-dr-damian-holsinger` | To the new `profile` |
|---|---|
| `coverImage` (`image-5801e44264c1a2308ecc8b6553d244e956cc0092-1018x970-png`) | `image` |
| `overview` (3 paragraphs, ~450 chars) | `fullBio` |
| — | `bio` — one or two sentences for the card and home page |
| — | `name`, `role`, `slug: damian-holsinger`, `hasPage: true` |

Then: set `settings.labHead` to the new profile, leave `showLabHeadOnHome` on, remove the project
from `home.showcaseProjects`, and delete the project document. Add a permanent redirect
`/projects/about-dr-damian-holsinger` → `/people/damian-holsinger` in `next.config.mjs` so existing
inbound links survive.

**This is done by hand in Studio, not by a script.** `profile` uses
`@sanity/orderable-document-list`, and this repo already recorded why that rules scripts out
(`scripts/backfill-profile-role-groups.ts:8`): Studio's orderable-list ranking cannot be safely
pre-computed from a standalone script, so a script-created profile would land with a broken sort
position. There is also no Studio login and no write token in the development environment, so the
final step is the maintainer's either way.

All code ships with `labHead` unset as a **valid, tested state**, so nothing breaks in the window
between deploying and doing the Studio edit: `/people` renders exactly as it does today, and the
home page simply omits the card.

---

## 5. Testing

**Unit (vitest)**

- Grid exclusion: the spotlighted profile is removed from the grid; a `labHead` that is unset,
  dangling, or absent from the profile list leaves the grid untouched.
- `groupByRoleGroup`: the lone catch-all section drops its title; named groups keep theirs; mixed
  named + catch-all is unchanged.
- `resolveHref('profile', slug)`, including the undefined-slug path.
- Lab-head link resolution: own page when `hasPage`, `/people` otherwise.
- `buildPersonJsonLd`: name only, name + role, name + role + image, and the missing-name guard.
- Settings fallbacks: `labHead` unset and `showLabHeadOnHome` unset both behave as specified.

**E2E (playwright)**

- `/people` with and without a spotlight.
- Person pages: 200 when enabled; 404 when `hasPage` is off, when the slug is unknown, and when
  `settings.showPeople` is off.
- Home card presence and absence under `showLabHeadOnHome`.
- The legacy `/projects/about-dr-damian-holsinger` redirect.

**Stated limitation:** the e2e suite runs against live production data, where `labHead` is unset
until the Studio edit in §4 is done. Until then the spotlight and home-card specs can only assert
the graceful-degradation path; the populated path is hand-verified after the content lands. The plan
must call this out in the PR rather than implying full coverage.

---

## 6. Decisions and rationale

**D1 — He becomes a `profile`, not a `page` or a bespoke singleton.** He is a person, and the site
already models people. One document per human means no duplicate name/photo/role to keep in sync,
and he appears in the People JSON-LD like everyone else.

**D2 — The lab head is designated by a reference in `settings`, not a boolean on the profile.** A
boolean allows two lab heads or none, with no way to detect either from the editing UI. A single
reference cannot be ambiguous, and handing the role to a successor is one field change.

*Rejected:* deriving the spotlight from the first Role Group, or from a group named "Principal
Investigator". Both fail silently when an editor reorders or renames a group — an invisible failure
mode on a site with no developer to diagnose it.

**D3 — `fullBio` is a new field rather than an upgrade of `bio`.** Cards want one line; the spotlight
wants paragraphs and links. Widening `bio` to portable text would also change the card overlay's
rendering for a field whose whole purpose is a short blurb.

**D4 — Person pages are opt-in via an explicit toggle, with the slug required when it is on.**
*Rejected:* treating slug presence as the enable signal. An editor who idly clicks "Generate"
publishes a page they never intended, and taking it down means deleting the slug — which silently
breaks any link already shared.

*Rejected:* an additional site-wide "Enable person pages" switch. It adds a second place to check
when a page doesn't appear, for a control the per-person toggle already provides.

**D5 — Person pages 404 when `showPeople` is off.** The existing toggles are documented as removing
pages from the site entirely, not merely hiding them from navigation. Person pages must honour the
same contract or that description becomes a lie.

**D6 — The home card keeps today's appearance, including the 16:9 crop of a near-square portrait.**
A 4:5 portrait frame would treat him better photographically, but the brief is that the home page
stays recognisable and Damian chooses whether it is there at all. The mislabelling is fixed by the
card leaving the "Our Research Projects" list and gaining its own heading, not by restyling it.

**D7 — The section heading is derived (`About {name}`), not typed.** A hardcoded name is frozen
forever; an editable heading field is one more thing to fill in and get wrong. Deriving it needs
neither.

**D8 — The lone "Other" heading is suppressed.** The alternative — asking the lab to create Role
Groups before the redesign looks right — makes a code deploy depend on content work that may not
happen.

---

## 7. Risks and coordination

- **PR #13 owns `ProjectListItem` right now, and §3.6 wants to refactor it.** The unmerged branch
  `worktree-image-display-and-dark-mode-fixes` rewrites that component's `classesWrapper` from
  `"relative aspect-[16/9] h-full h-full "` to `"aspect-[16/9] h-full"` with a nine-line comment
  explaining why both properties are load-bearing at different breakpoints, and adds
  `components/pages/home/project-card-contract.test.ts` and `e2e/image-geometry.spec.ts` to guard it.
  **The `FeatureRow` extraction should land after PR #13 merges.** If it cannot, the extraction must
  reproduce PR #13's final geometry and comment rather than main's current line, and the merge must
  be resolved by hand — a textual auto-merge here silently reintroduces the duplicated `h-full` bug
  that PR #13 fixed.
- **`settings` collides with Phase 4A.** Phase 4A (`docs/superpowers/plans/2026-08-12-phase-4a-identity-foundation.md`)
  adds `siteName`/`shortName` plus Studio **field groups** to the same singleton. Whichever lands
  second rebases: this work's two fields belong in a "Lab head" group once 4A's groups exist.
- **`labHead` is optional and can dangle.** Deleting the referenced profile leaves a reference to a
  missing document; the dereferenced projection returns `null` and every consumer treats that as
  unset. Covered by unit tests.
- **`npm test` currently reports other worktrees' suites.** Phase 4A Task 1 fixes `vitest.config.ts`;
  until it merges, run this work's tests with an explicit path filter and do not trust a bare
  `npm test` count.
- **Retiring the project document is irreversible.** The redirect must be deployed before, or with,
  the deletion.

## 8. Out of scope

- **MAESTRO** (`slug: maestro`) is a student initiative, not a research project, but sits in
  `showcaseProjects` under "Our Research Projects" — the same category error, one level milder.
- **"Publication highlights"** (`slug: publication-highlights`) is a project document linked from
  nowhere; it is reachable only by direct URL.
- **Nav changes.** Nothing is added to `settings.menuItems`; `/people` is already in the nav.
- **Creating Role Groups** and assigning the 19 existing profiles to them. Content work the lab can
  do at any time; the design behaves correctly before and after.
- **Per-person publication lists** on person pages, and profile link fields (ORCID, Scholar). Links
  can live inside `fullBio` until there is evidence a structured field is needed.

---

## 9. Suggested sequencing

This is larger than one sitting, and each stage below is independently deployable — with `labHead`
unset, every stage is a no-op for visitors, so none of them has to wait for the content edit.

1. **Model and spotlight.** All five schema fields, query and typegen updates, the shared person
   component, the `/people` spotlight, grid exclusion, and the "Other" heading suppression.
2. **Person pages.** The `/people/[slug]` route, its metadata and `Person` JSON-LD, the `profile`
   case in `resolveHref`, and the sitemap wiring.
3. **Home card.** The `FeatureRow` extraction (gated on PR #13 per §7), the home-page section and its
   link resolution, and the `next.config.mjs` redirect.
4. **Content, in Studio** (§4) — the only step that changes what visitors see.

A plan may merge 1 and 2; stage 3 is the one with an external dependency.
