# Agreed IA — Holsinger Lab (Round 1 outcome)

Contract for the visual round and the engineering port. Merged from option 1c
(output-led spine) + 1a's taxonomy as flat tags + one light Research page.

> **Note to the visual round: composition is open.** This document fixes block
> order and content only — no widths, column counts, alignment or sizes are
> implied. The round-1 wireframes were structural sketches; their rectangles are
> not layout decisions. Directions are free to use asymmetry, editorial grids,
> off-centre type, full-bleed elements and varied density.

Net change: **one new type (`resource`), one type retired (`project`), no bios
required, nothing that rots if the PI is busy.** Home is auto-generated with zero
editorial fields — it cannot go stale; preserve that property in any refinement.

## 1. Sitemap

- Home (auto-generated recent-work dashboard)
- Publications (facets: year · type · topic)
  - One page per paper × 19
- Research (single light page, no new type)
- Resources
  - Electrical-stimulation cell-culture chamber (sole item at launch — do not pad)
- People (alumni merged in)
- Lab
  - About & Dr Damian Holsinger
  - MAESTRO talks · Support our research · Contact

Tutorial and Miscellaneous pages leave public nav.

## 2. Page types

**New (1):**
- `resource` — fields: title, kind (hardware / protocol / software / dataset),
  summary, linked publication, how to obtain. Launches with exactly one item.

**Changed:**
- `publication` — gains its own page and fields: type (article / review / case
  report), topic tags (≥1, from the taxonomy in §4), linked resource, formatted
  citation. Abstract, authors, journal, volume/issue/pages, date, DOI/URL already
  exist in the data for all 19. DOI is the canonical link; **9 papers lack a DOI**
  (Carnosic acid '23, Oxidative stress & antioxidants '23, Fiber/EF BDNF '23,
  FMT review '23, FMT 5xFAD '22, Non-pharmacological options '22, Cerebellar
  AVM '21, Leptin/LepR '20, Adiponectin receptor '20) — for these the recorded
  `url` is the fallback link.
- `home` — auto-generated from publication dates + latest resource + next MAESTRO
  talk. Zero editorial fields.
- `roleGroup` — populated with six groups: Research Scientists (2) · PhD (1) ·
  Honours (8) · Postgraduate research (3) · Undergraduate (4) · Visiting (1).
- `settings` — `labHead` set to Dr Damian Holsinger (unset today).

**Existing, unchanged:**
- `profile` — no bios required for students; the PI's profile takes the bio text
  currently stranded in the "About Dr Damian Holsinger" pseudo-project.
- `page` — About, Support, Contact; Alumni content merges into People.

**Retired (1):**
- `project` — its five entries redistribute: the two real projects (gut
  microbiota; glial activity) → sections on the Research page; PI bio → About /
  PI profile; MAESTRO → Lab section; "Publication highlights" → featured flag on
  `publication`.

## 3. Screens — ordered block lists

Blocks in order, top to bottom. Content and audience question only; composition open.

### Home
1. Identity line — lab name wordmark + tagline "Advancing the Understanding and
   Treatment of Neurological Disorders through Molecular Research", The University
   of Sydney. *Q: what is this? (all)*
2. Recent work — latest 5 publications by date (auto), year-first, title +
   journal. *Q: is this lab active, what's new? (peers, funders)*
3. Resource — the ES cell-culture chamber, kind, source paper. *Q: can I reuse
   their methods? (peers)*
4. MAESTRO — postgraduate student talks, Tuesdays 10am GMT, register link.
   *Q: outreach / public face (funders, public)*
5. The lab — PI name + member count + link to Support. *Q: who are they, how to
   help? (funders, students)*
6. Footer — "Designed by Brett Yang · Copyright 2026 © Holsinger Lab".

### People
1. Lab head — Dr Damian Holsinger, short bio (from the retired pseudo-project),
   email. *Q: whose lab is this? (all)*
2. Members — grouped by the six roleGroups, name + role + portrait (real image
   URLs provided; Jiyoo Choi has none). No student profile pages. *Q: who did
   this work; are there people like me? (peers, students)*
3. Alumni — inline list (bare names today, kept honest). *Q: where do members go
   next? (students)*

### Publications (index)
1. Count + facets — year (2020–2025) · type (article 11 / review 7 / case
   report 1) · topic (5 tags). *Q: navigate the record (peers)*
2. List — year-first rows: title, full authors with Holsinger recognisable,
   journal, DOI (or url fallback), copy-citation, topic tags; each row opens the
   publication page. *Q: check output, cite (peers)*

### Publication page (one per paper)
1. Title, authors (PI recognisable), journal · volume(issue) · pages · date.
2. Type + topic tags.
3. Abstract (present in data for all 19).
4. Canonical link — DOI, or recorded `url` for the 9 without one.
5. Formatted citation with copy.
6. Linked resource where one exists (Biomedicines '24 → ES chamber).
*Q: read, cite, trace this specific paper (peers)*

### Research (single light page)
1. Involvement of gut microbiota in Alzheimer's disease (since 2023; Gut, Brain,
   Microbiome) — existing overview text verbatim. *Q: what does the lab work on,
   in narrative form? (students, public)*
2. Glial activity as a marker of disease (since 2018; Astrocytes, Microglia) —
   existing overview text verbatim.
3. One line inviting student and collaboration enquiries by email
   (damian.holsinger@sydney.edu.au). No `opportunity` type, no positions list to
   keep current. *Q: can I get involved? (students, collaborators)*

## 4. Topic-tag taxonomy — 19/19 mapping

Flat tags on `publication`; no theme documents, pages or overviews.

- **Gut–brain & non-pharm therapies (3):** FMT review '23 · FMT 5xFAD '22 ·
  Non-pharmacological options '22
- **Glia & neuroinflammation (4):** INPP5D/SHIP1 '23 · TREM2 '22 · GSDIM
  microglia–synapse '21 · Aβ–astrocyte oxidative stress '20
- **Electrical stimulation & neural engineering (3):** ES chamber '24 · Fiber/EF
  BDNF '23 · KNN piezoelectric films '20
- **Metabolism, oxidative stress & neuroprotection (4):** Carnosic acid '23 ·
  Oxidative stress & antioxidants '23 · Leptin/LepR '20 · Adiponectin '20
- **Neuro-oncology & biomarkers (5):** CBX7 '25 · Glioblastoma PET '20 ·
  Genome-wide blood–brain '20 · Molecular signatures '20 · Cerebellar AVM '21

Rule: every paper gets ≥1 tag at entry; **an untagged paper still appears under
year and type facets — the record never hides anything.**

## 5. One-click audience map (from Home)

- **Peers:** recent work on Home; Publications (facets, per-paper pages, citation
  copy); Resources.
- **Prospective students:** Research page (narratives + enquiry line); People.
- **Funders / public:** the dashboard itself shows cadence and journals; MAESTRO
  and Support one click via Lab and the Home blocks.

## 6. Open questions for the lab (PI decisions)

1. Topic tags for future papers: does the 5-tag set hold, and who confirms each
   new paper's tag at entry?
2. The 5th tag ("Neuro-oncology & biomarkers") is a deliberate consolidation —
   acceptable, or split with an explicit "Other clinical & collaborative work"
   bucket?
3. Featured flag: keep the three highlight papers (Oxidative stress '23, FMT
   review '23, FMT 5xFAD '22) and their citation counts, and who updates counts?
4. MAESTRO: is "Tuesdays 10am GMT" still current, and should the next-talk line
   on Home be a settings field or dropped if it can't be kept fresh?
5. Alumni: stay a bare name list, or add year + degree per person (small one-time
   write-up)?
6. Enquiry line wording on Research: is the lab actually open to Honours/PhD
   enquiries year-round?
7. Jiyoo Choi has no portrait — supply one or accept an initials placeholder?
