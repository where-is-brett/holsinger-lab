# Claude Design–driven redesign experiment — design

**Date:** 2026-08-19
**Status:** Rounds 1 and 2 complete; direction chosen (Modern Instrument); 2C refinement, then Round 3
**Owner:** Brett Yang (engineering side); Claude Design app (design side)

## 1. Purpose

Explore a UI/UX redesign of the Holsinger Lab site that suits an academic setting
while being elegant, contemporary and aesthetically ambitious — "we build elegant
products". This is an **experiment**: production (`main`, live Sanity dataset,
Studio schema) is not changed until Brett explicitly decides to merge.

Claude Design (the claude.ai/design app and its agent) **drives the design work**.
This repo's Claude Code session prepares the briefing package, reads results and
comments back through the Claude Design MCP, and later ports the winning direction
into code on an isolated branch.

## 2. Decisions taken in brainstorming

| Question | Decision |
|---|---|
| Brand latitude | *Identity mostly open*: logo mechanism (generated wordmark / CMS-uploaded logo) may stay; type pairings and palette are open to new proposals. |
| Audience | Balanced mix — peers/collaborators, prospective students/postdocs, funders/university/public. Home must route each group quickly. |
| References | None supplied; Claude Design proposes divergent directions. |
| Screens, round 1 | Home, People, Publications, Project (four page types). |
| Content model | Open — Sanity schema may change; new page types welcome; **prefer fewer, stronger types**. |
| Landing zone for code | Separate `redesign/<direction>` branch in a git worktree with preview deploy; nothing merges without approval. |
| Content in mockups | Real content scraped from the live site (people, roles, publications, projects, home copy). Sanity untouched. |
| Extra design skills | Brett pastes the Emil design skill and Apple HIG skill into each Claude Design chat; prompts carry a reminder line. |
| Models | Sonnet-only for implementation (code-writing) subagents in this repo; design/explore/verify/review subagents unrestricted. |

## 3. Approach — three rounds, Claude Design drives

### Round 1 — information architecture & content model (low-fi)

One canvas, three IA variants side by side; deliberately un-styled grey-box
wireframes so feedback is about structure.

Variants briefed so they genuinely differ:

1. **Research-led** — home organised around 3–5 research themes (`theme` doc);
   people/projects/publications hang off themes; per-publication page
   (`/publications/[slug]`: abstract, DOI, BibTeX, related people/projects);
   lightweight `news` feed.
2. **People-led** — group, alumni, "join us" (`opportunity` doc) lead; person
   pages become rich CVs (education, awards, talks); projects foreground teams.
3. **Output-led / archive** — publications first-class with year/type/venue
   facets; `resource` doc (dataset, software, protocol); talks, teaching; home
   is a recent-outputs dashboard.

Each variant: sitemap, page-type list (existing + new), one-line content-model
note per new type, what to retire (e.g. generic `page`), wireframes for the four
screens. Candidate new types are limited to `theme`, per-publication page,
`news`, `opportunity`, `resource`; expectation is the winner needs ≤2 new types.

**Output:** an agreed sitemap + content model, recorded in `brief/agreed-ia.md`
in the Claude Design project and appended to this spec (§7).

### Round 2 — three divergent visual directions on the agreed IA

Sessions in the app (prompts supplied by this repo):

- **Session A** — three divergent directions for Home only, one canvas, each with
  type ramp and palette swatches beside its screen. Working hypotheses handed to
  the app (it may counter-propose):
  1. *Editorial / journal* — serif-led, generous margins, footnote-like metadata,
     one quiet accent.
  2. *Modern instrument* — grid-forward, mono for data (years, DOIs, roles),
     sharp hierarchy, colour used structurally.
  3. *Warm studio* — humanist sans, photography-led people/project surfaces,
     softer tonality.
- **Session B** — extend the chosen direction to People, Publications, Project,
  plus a mobile Home frame.
- **Session C** — refinements from Brett's pinned comments.

Rules carried in the brief: real content from `brief/content.json`; imagery as
labelled placeholders (no faux SVG art) except portraits already public on the
site; no filler sections; every element earns its place; dark mode considered.

### Round 3 — design system, code port, isolation

- **Design system project** "Holsinger Lab Design System" created in Claude Design
  from the winning canvas: tokens (colour incl. dark mode, type ramp, spacing,
  radii), core components (nav, person card, publication entry, project card,
  section header, footer), usage rules. It becomes the bound design system for
  future lab deliverables and the contract the code port follows.
- **Code port** on `redesign/<direction>` in a git worktree: page-by-page in the
  real Next 16 + Tailwind 4 app against real Sanity content, including additive
  schema documents required by the agreed IA. Existing Vitest / Playwright / axe
  suites extended, not bypassed. Implementation subagents Sonnet-only.
- **Isolation:** nothing merges to `main`; review via `npm run dev` from the
  worktree or a preview deploy. Schema changes are deployed to Studio only on
  explicit instruction; until then they exist on the branch alone.
- Round 3 gets its own implementation plan via `writing-plans` when reached.
  Rounds 1–2 are briefing artefacts and need no plan.

## 4. Claude Design workspace

- Project: **"Holsinger Lab — Academic Redesign"**, sharing `invited` until Brett
  widens it.
- Layout:
  - `brief/00-brief.md` — lab, audiences, stance ("academic yet elegant/modern"),
    fixed vs open, rules.
  - `brief/content.json` — scraped live content.
  - `brief/agreed-ia.md` — written after Round 1.
  - `prompts/round-1-ia.md`, `prompts/round-2-directions.md`,
    `prompts/round-3-design-system.md` — paste-ready session prompts, each
    naming the files to read first, screen sizes, option-count convention, and
    the "attach Emil + Apple HIG skills" reminder.
  - Deliverables the app produces: `01 IA Options.dc.html`,
    `02 Visual Directions.dc.html`, later design-system files. Old versions are
    preserved (`… v2.dc.html`), never overwritten.
- Feedback loop: Brett pins comments in the editor and uses "Send to Claude"
  where the Claude Code side should act; Claude Code polls `list_comments`, acts
  on `author_is_you` comments, `ack_comments` after handling. Rounds end when
  Brett says "go" in chat.
- Write hygiene from this side: `finalize_plan` `scope:"project"` once per
  session; etags threaded on every `write_files`; never regenerate a file from
  memory.
- Links shared with Brett are always `claude.ai/design/...`; `serve_url` never
  appears in user-facing text or files.

## 5. Division of labour

| Claude Design app (Brett drives) | Claude Code (this repo) |
|---|---|
| Generates IA options, visual directions, design system | Prepares brief, content, prompts; scrapes live site |
| Runs its own verify loop / design-verifier | Reads back files + comments; answers questions; writes follow-up prompts |
| Editor comments, tweaks | Records agreed IA + decisions in this spec |
| — | Round 3 code port on isolated branch; schema additions; tests |

## 6. Success criteria

- Round 1: Brett can point at one IA (or a merge) and say "this is what the lab
  site should be"; ≤2 new content types.
- Round 2: at least one direction Brett would put in front of the lab head as
  "the new site", visibly distinct from the current one, judged on real content.
- Round 3: design system exists in Claude Design; branch renders the four
  screens against live content with tests green; `main` untouched.

## 7. Agreed IA (Round 1 outcome, 2026-08-19)

Full contract: `brief/agreed-ia.md` in the Claude Design project. Summary:

Merge of option 1c (output-led spine) + 1a's taxonomy demoted to flat tags + one light
Research page. **Net: one new type (`resource`), one type retired (`project`), no
profile bios required, no content that rots if the PI is busy.**

- **Home** — auto-generated from publication dates + latest resource + next MAESTRO
  talk; zero editorial fields.
- **Publications** — faceted index (year / type / topic) plus one page per paper:
  abstract, authors, journal metadata, DOI canonical link, formatted citation with copy.
- **Research** — single light page carrying the two real project narratives + an
  enquiry line. No `opportunity` type.
- **People** — six populated roleGroups, alumni merged in, no student profile pages.
- **Resources** — `resource` type, launching with one honest item (ES cell-culture
  chamber).
- **Topic tags** — five flat tags covering all 19 papers (3/4/3/4/5); untagged papers
  still surface under year and type facets.

### Engineering gaps found when checking the contract against the real schema

These do not block the visual round; they are port-time work:

1. `publication` has **no `slug` field** — required for `/publications/[slug]`. Add,
   with a generated slug from title + year.
2. `publication` has **no `featured` field** — the agreed IA relies on one to absorb the
   retired "Publication highlights" entry. Add.
3. **The PI has no `profile` document.** All 19 profiles are lab members; none is
   Damian Holsinger. Setting `settings.labHead` requires creating that profile first,
   seeded with the bio text stranded in the "About Dr Damian Holsinger" pseudo-project.
4. Retiring `project` breaks `home.showcaseProjects` (an array of project references)
   and removes the `/projects/[slug]` route — needs a migration plus redirects for the
   five existing project URLs.

## 8. Chosen direction (Round 2 outcome, 2026-08-19)

**Modern Instrument** wins. Built out in full as `03 Modern Instrument - Screens.dc.html`
(refined to `… v2.dc.html` in session 2C); the rejected alternative `03 Editorial -
Screens.dc.html` stays in the project for reference.

Direction characteristics to preserve in the design system and the port:

- Grid-forward composition with a numbered section rail (01 identity, 02 recent work,
  03 resources, …) running down the left edge.
- Archivo for display and headings (sentence case, not the caps of the first sketch),
  IBM Plex Mono for all data — years, DOIs, roles, labels.
- Publications as a true four-column row: year | title·authors·tags | journal |
  link·cite. This anatomy is the reason the direction won; it is load-bearing.
- Colour used structurally, ultramarine accent; light and dark palettes defined in oklch.
- Identity block pairs the wordmark with the affiliation overline and a PI block, which
  is what keeps it reading as a university lab rather than a product brand.

Round 2 audit findings (both builds): no fabricated DOIs, all 19 people correctly
grouped, portraits correctly matched, all publication metadata correct, no invented
content, all six interaction-state strips present, block order conforming. Two defects
in Modern Instrument fixed in 2C: an upper-cased DOI label on the Home resource block,
and MAESTRO's "TUE · 10:00 GMT" presented as settled despite being open question §6 Q4.
2C also adopts Editorial's scale solution (sticky facets, compact density, an explicit
answer for 60 rows) and adds the open mobile-nav state.

## 9. Out of scope

- Merging anything to `main`, deploying Studio schema, changing live content.
- Redesigning Studio itself.
- Contact and generic Page templates in Round 1–2 (they follow the system in
  Round 3).
