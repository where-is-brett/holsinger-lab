# Holsinger Lab site — templates

The five agreed-IA screens rebuilt from the design-system components, proving the
system against real content (all 19 publications, all 19 members, verbatim project
and bio text from `content.json`).

- `index.html` — interactive: the nav switches pages; publications facets, density
  toggle and copy-citation are live. Routes: #home · #pubs · #paper · #people · #research.
- `Home.jsx` — auto-generated dashboard (identity → recent 5 → resource → MAESTRO → lab).
  Zero editorial fields; it cannot go stale.
- `PublicationsIndex.jsx` — count + sticky facet band (year/type/topic + density),
  full 19-row record. Owns all filter state; FacetBand is presentational.
- `PublicationPage.jsx` — CBX7 '25: title, authors (PI emphasized), tags, abstract,
  canonical DOI, formatted citation with copy. CBX7 has no linked resource, so that
  block is honestly absent (it appears on the Biomedicines '24 chamber paper).
- `People.jsx` — lab head + six role groups (6-col grid) + honest alumni placeholder.
  Jiyoo Choi renders the initials fallback.
- `Research.jsx` — two project narratives (verbatim text) + inverse enquiry band
  (example wording, flagged).
- `LabData.jsx` — the real content + derivations (PI emphasis split, DOI/URL
  fallback, citation strings). In production this comes from Sanity.

Desktop composition is designed at 1440. Below 720px, publication rows switch to
the stacked `narrow` anatomy and the rail narrows to `--spacing-rail-sm` (see the
mobile specimens on the navigation component card).
