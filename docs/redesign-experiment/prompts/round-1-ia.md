# Round 1 — Information architecture & content model

Paste-ready session prompts. Before each session: attach the Emil design skill and the
Apple HIG skill to the chat.

---

## Session 1A — three IA options (paste this)

Read `brief/00-brief.md` and `brief/content.json` in this project before doing anything.

I want to rethink what this academic lab site *is* before we touch visuals. Produce
**one canvas** (`01 IA Options.dc.html`, canvas mode) with **three information-architecture
options side by side**, deliberately un-styled: grey boxes, one typeface, no colour, no
imagery. Feedback in this round is about structure only.

Each option is one column containing, top to bottom:

1. **Name + one-line stance** (what this option believes the lab site is for).
2. **Sitemap** — top-level nav plus second-level pages, as an indented list.
3. **Page types** — the content types the site would be built from. Mark each as
   *existing*, *changed*, *new*, or *retired* relative to today's model (profile,
   publication, project, page, roleGroup, home, settings). For every *new* or
   *changed* type: one line on its fields and one line on which audience question it
   answers. Prefer fewer, stronger types; do not propose more than **two** new types
   per option. Candidate new types you may draw from — but must justify — are: research
   `theme`; a per-publication page; `news`/update; `opportunity` (open positions /
   how to join); `resource` (dataset, software, protocol). Say what to *retire* too.
4. **Wireframes** for four screens at 1440 wide, stacked: **Home**, **People**,
   **Publications**, **Project** (or the nearest equivalent in that option — say if
   the option renames or reshapes it). Grey boxes with short labels for every block;
   real content labels from `content.json` where a block would hold real content
   (e.g. the actual tagline, real project names, real role groupings you propose).
5. **How each audience gets home → what they need in one click** — three short lines
   (peers, prospective students, funders/public).
6. **What this option fixes** from the current-state observations in the brief
   (messy roles, non-projects in Projects, generic pages, flat publications), and
   **what it costs** (content the lab must write or maintain).

The three options must genuinely differ in stance, not just in ordering:

- **Option 1 — Research-led.** The lab is its questions. Home is organised around a
  small number of research themes; people, projects and publications hang off themes.
- **Option 2 — People-led.** The lab is its people. Home leads with the group, the PI,
  alumni and how to join; person pages become rich academic profiles.
- **Option 3 — Output-led / scholarly record.** The lab is its outputs. Publications
  (with facets), resources, talks are first-class; Home is a calm dashboard of recent
  work; minimal marketing.

If you think a fourth stance would beat all three, add it as a narrower fourth column
and say why.

Constraints: real content only from `content.json`; no filler; every block must name
what audience question it answers (a tiny caption under the block is fine). Keep the
canvas readable at a glance — this is a thinking tool, not a deliverable.

When done, give me the link to the canvas and a five-line summary of where the three
options disagree most.

---

## Session 1B — revise from comments (paste after I've pinned comments)

Read `brief/00-brief.md`, then open `01 IA Options.dc.html` and read every pinned
comment on it. Apply the comments; where a comment asks for a merge of options, build
the merged option as a new column and label it clearly. Save as
`01 IA Options v2.dc.html` (keep v1). Summarise what changed per comment.

---

## Session 1C — write the agreed IA (paste when I've chosen)

We're going with: **<option name or "merge of X + Y as follows: …">**.

Read `brief/00-brief.md` and the chosen column in the latest `01 IA Options*.dc.html`.
Write `brief/agreed-ia.md` — a plain markdown document with: the sitemap; the final
page-type list with fields (existing / changed / new / retired); the four screen
wireframes described in words as ordered block lists (Home, People, Publications,
Project); the one-click audience map; open questions for the lab. This file is the
contract for the visual round and for engineering — be precise, no marketing language.
