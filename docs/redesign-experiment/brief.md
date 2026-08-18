# Holsinger Lab — Academic Redesign: brief

Read this file first in every session, then `brief/content.json`. Rounds build on
each other; later rounds also read `brief/agreed-ia.md` when it exists.

## Who / what

**Holsinger Lab — Laboratory of Molecular Neuroscience and Dementia, The University of
Sydney.** A research group led by Dr Damian Holsinger (academic with teaching and
research duties; molecular biology, neuroscience, neurodegeneration; Alzheimer's
disease, glial activity, gut microbiota, electrical stimulation of neural growth; work
spans cell, mouse models and human tissue). ~19 current people
(PhD, honours, MD, diagnostic-radiography and biomedical-engineering students plus
research scientists), 19 listed publications, a handful of research projects, an
outreach programme (MAESTRO — school-age science engagement), an alumni list, and a
"support our research" page.

Current site: a Next.js + Sanity site with a generated wordmark, CMS-driven brand
colour, dark mode, monospace/serif type. Competent, but generic and not organised
around how academic audiences actually look for things.

## Goal

Redesign the site's **information architecture, content model and visual design** so
that it:

1. Reads unmistakably as a serious academic research lab, **and**
2. Is elegant, contemporary and aesthetically ambitious — the standard is "we build
   elegant products", not "university template". Restraint, typography, rhythm and
   whitespace over decoration.

This is an experiment. Nothing here ships automatically; the winning direction is
later ported by engineers into the real codebase.

## Audiences (balanced — none dominates)

| Audience | Comes to… | Must find within one click of Home |
|---|---|---|
| Peer researchers & collaborators | check output, find a person, cite | Publications, People, Projects/Themes |
| Prospective students & postdocs | judge culture & opportunities | People, what the lab works on, how to join |
| Funders / university / public | see impact & credibility | What the lab does, PI, outreach/support |

Home must route each group in one glance without becoming three sites in a trench
coat.

## What is fixed vs open

- **Open:** page types, sitemap, content model (Sanity schema may change), type
  pairings, palette, layout, components, interactions, motion, dark mode treatment.
- **Mostly fixed:** the *mechanism* of the logo (a generated wordmark from the site
  name, or a CMS-uploaded logo). You may restyle how/where it appears; don't design a
  new logo mark.
- **Fixed:** the content in `content.json` is real — use it, don't invent people,
  papers or projects. Portraits: real image URLs are provided; use them. Other
  imagery: labelled placeholders only.

## Current-state observations (problems the IA should address)

- Roles are 14 free-text strings ("Honours student (Diagnostic Radiography)",
  "Research Student - MD (UNSW)", "PhD Student"…). A `roleGroup` type exists but has
  zero entries, so People has no real grouping today.
- "Projects" mixes genuine research projects (gut microbiota & AD; glial activity)
  with things that aren't projects: "About Dr Damian Holsinger", "Publication
  highlights", and the MAESTRO outreach call. The content model lacks the right
  homes for PI profile, outreach, and highlights.
- Generic pages: Recent Lab Alumni, Miscellaneous, Support our research, Tutorial.
  Alumni and Support are real needs wearing a generic template.
- Publications are a flat list; papers have DOI, journal, volume/issue/pages, date,
  and abstract available — richer than the page shows.
- Navigation currently exposes only Home in the CMS menu; People, Publications and
  Contact are toggled by settings.
- Lab head is a settings field (unset in data today) that can spotlight the PI on
  Home and People.

## Rules for every deliverable

- **Real content only.** People, roles, papers, projects, tagline, footer from
  `content.json`. If a section needs content that doesn't exist yet (e.g. a news
  item, an open position), write **one** clearly-marked example and say what the
  lab would need to supply.
- **No filler.** Every section, card, stat and icon must earn its place — name the
  audience question it answers. Prefer fewer, stronger page types; the expected
  outcome of the IA round is ≤2 new content types.
- **Options side by side.** When asked for options, put them on one canvas so they
  can be compared at a glance; label each with a short name and a one-line stance.
- **Un-styled when asked for IA / wireframes.** Grey boxes, one typeface, no colour —
  feedback there is about structure.
- **Full fidelity when asked for visual directions.** Commit to a distinct aesthetic
  stance per direction (type, colour, composition, density, motion), not colour swaps
  of one layout. Show the type ramp and palette beside the screens. Consider dark
  mode. Avoid generic AI-site tropes.
- **Screens:** desktop at 1440 wide; add a 390-wide mobile frame where asked.
- **Academic conventions to respect:** author lists with the PI's name recognisable,
  DOI as the canonical link, year-first scannability, citation copy, ORCID/Scholar
  style external links, clear affiliation.
- Preserve prior versions when revising (`… v2.dc.html`), don't overwrite.
