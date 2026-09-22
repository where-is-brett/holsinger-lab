# What you'll see on the redesign preview

Written 2026-09-23, after Phase 3 step 2 (PRs #33, #36, #37) landed on
`redesign/integration`. For whoever walks Damian through the preview.

Every screen in the agreed plan is built. Some blocks are empty, and **that is by
design, not a bug**: the site shows what the CMS holds and says so plainly when
there is nothing, rather than inventing filler. Each empty block below has one
content step that fills it, and none of them needs a code change.

## The content state today

Measured against the live dataset on 2026-09-23:

| Content | State |
|---|---|
| Publications | 19, all with their own page, all tagged by topic |
| Publication type (article / review / case report) | **not set on any** |
| People | 20 profiles in 6 groups, 5 of them alumni |
| Lab head (Settings → Lab head) | **not set** |
| Resources | **none** |
| Projects listed on the Research page | **none** (the "Position on the Research page" field is empty on all of them) |
| MAESTRO talks project | present |
| Support page | present |
| Site name (Settings) | **not set**, so the header shows the built-in "Holsinger Lab" |

## Screen by screen

### Home
**Shows now:** the lab name and tagline, the five most recent papers with links,
the MAESTRO talks block with its register link, and the lab block with the member
count and a link to Support.

**Empty:** the resource block, and the principal-investigator panel.

**To fill:** add the chamber resource (below), and set Settings → Lab head.

### Publications
**Shows now:** all 19 papers, filters for year and topic, a density toggle, and
a page per paper with its abstract, link and citation.

**Empty:** the **Type** filter is hidden, because no paper has a type yet.

**To fill:** run the type backfill. It proposes 11 articles, 7 reviews and 1 case
report, and asks for confirmation before writing.

### People
**Shows now:** all six groups with photos, roles, and the alumni as a name list.

**Empty:** the lab-head spotlight at the top.

**To fill:** set Settings → Lab head to Dr Holsinger's profile. He then moves out
of the group list into the spotlight. He has no portrait, so it will show his
initials until one is uploaded.

### Research
**Shows now:** only a line saying projects will be listed here, plus the
enquiries band.

**To fill:** set "Position on the Research page" (1, 2, 3…) on each project to
list. Each one then shows its since-year, tags, overview and cover image.

### Resources
**Shows now:** "No resources are listed yet."

**To fill:** add the resource (below).

### Contact and the other pages
Unchanged by the redesign, restyled to match.

## The four content steps, in the order that helps most

1. **Set Settings → Lab head.** One click. It turns on the People spotlight and
   Home's PI panel.
2. **Run the publication-type backfill.** It reveals the Type filter on
   Publications. Needs a write token:
   `node --env-file=.env.local scripts/backfill-publication-types.ts --commit`
   (run it without `--commit` first to see what it would change).
3. **Set "Position on the Research page"** on the projects to show, which fills
   the Research page.
4. **Add the electrical-stimulation chamber resource** — title, kind
   (hardware), a short summary, how to obtain it, and a link to the 2024
   Biomedicines paper. This fills the Resources page, Home's resource block, and
   the "linked resource" section on that paper's page. **The summary and
   how-to-obtain wording have to come from the lab**; nobody has written them
   yet, and the site will not invent them.

## Two things worth saying out loud in the walkthrough

- **Nothing here goes stale on its own.** Home is generated from the papers,
  people and projects in the CMS. There is no separate homepage to keep updated.
- **Text is shown exactly as it is typed in the CMS,** including the current
  typo in the MAESTRO project's title ("endevor"). Fixing it is a content edit in
  Studio, not a code change.
