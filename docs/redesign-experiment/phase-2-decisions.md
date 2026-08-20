# Phase 2 — content model: decisions and state

Every departure from the plan, and why. Companion to `phase-1-decisions.md`.
Written 2026-08-19. Branch `redesign/phase-2-content-model`, off
`redesign/integration`.

## Status

| Plan item                                                   | State                         |
| ----------------------------------------------------------- | ----------------------------- |
| `publication.slug` (generated from title + year)            | done                          |
| `publication.featured`                                      | done                          |
| Topic-tag field carrying the five-tag taxonomy              | done                          |
| `resource` document type, registered in `sanity.config.ts`  | done                          |
| Registered in the Studio structure (`plugins/settings.tsx`) | **no change needed** — see §7 |
| GROQ queries extended, `npm run typegen` re-run             | done                          |
| Migration: slug backfill                                    | done, dry-run by default      |
| Migration: tag assignment                                   | done, dry-run by default      |
| Migration: roleGroup population                             | **already shipped** — see §8  |
| Migration: PI `profile` creation                            | done, dry-run by default      |

## Verification

| Command              | Result                                                 |
| -------------------- | ------------------------------------------------------ |
| `npm test`           | 351 passed, 41 files (baseline was 323 / 38)           |
| `npm run type-check` | clean                                                  |
| `npm run lint`       | 0 errors, 4 warnings — the same four pre-existing ones |
| `npm run typegen`    | clean, 16 queries and 36 schema types (was 12 and 34)  |
| `npm run build`      | **not run — cannot run in the cloud session.** See §11 |
| `npm run test:e2e`   | **not run — same reason.** See §11                     |

## 1. `publication.type` was added, though Phase 2's prose does not list it

The plan's Phase 2 paragraph names slug, `featured`, the `resource` type and
topic tags. It does not mention `type`. It is added anyway, because two other
things in the repo already require it:

- `agreed-ia.md` §2 says `publication` gains "type (article / review / case
  report)", and §1 gives the Publications facets as "year · type · topic".
- Phase 1 already shipped `components/redesign/facets.ts`, whose `applyFacets`
  filters on `p.type`, and `publicationRow.ts`, whose `Publication` interface
  declares `type: string`.

Without the field, one of the three facets Phase 1 built would have no data
behind it. Values are `Article`, `Review`, `Case report`, per the IA.

## 2. The publication/resource link is stored once, on the resource

The IA lists "linked publication" among `resource`'s fields _and_ "linked
resource" among `publication`'s. Modelling both would be two fields to keep in
agreement, with nothing enforcing it.

It is stored once, on `resource.publication`, and read back the other way in
GROQ (`*[_type == "resource" && references(^._id)]`). The resource side was
chosen because a resource has exactly one source paper — the IA says "the ES
cell-culture chamber, kind, source paper" — while a paper could yield several
resources, and because `resource` is the new and rarer document, so the editing
burden lands where the editor is already working.

## 3. `slug` and `type` are deliberately not `required()`

Both fields are new, and all 19 live publications predate them. This work does
not write to the live dataset, so marking either `required()` would light up
every existing publication as invalid in Studio — 19 false alarms — until
someone runs the backfill.

The IA's own rule points the same way: "an untagged paper still appears under
year and type facets — the record never hides anything." Phase 3 can tighten
`slug` to required once the backfill has run and `/publications/[slug]` exists.

`publicationPaths` filters on `slug.current != null`, exactly as `projectPaths`
and `profilePaths` already do, so a publication without a slug is simply absent
from the generated routes rather than a build error.

## 4. The slug needed its own builder, not `options.source`

`schemas/lib/slug.ts`'s `slugify` caps output at 96 characters. Real publication
titles here run well past that — the 2025 CBX7 title slugifies to over 140 — so
composing `"<title> <year>"` and handing it to `slugify`, which is the obvious
implementation, silently truncates the year off the end of exactly the long
titles most likely to collide.

`schemas/lib/publicationSlug.ts` instead truncates the _title_ to a 91-character
budget, on a hyphen boundary so no word is split, and appends `-YYYY` after.
`options.slugify` is then the identity function, because the source already
returns the finished slug and re-running `slugify` would re-apply the 96-cap and
undo the whole thing.

`schemas/lib/publicationSlug.test.ts` asserts the year survives a 140-character
title. That test is the reason this module exists.

## 5. Topic titles are the stored values, and the en dash is load-bearing

`topics` stores the tag title itself rather than a key. The titles are the
taxonomy's identity in `agreed-ia.md` §4, they are what the design renders
verbatim, and a parallel key space would be one more mapping to keep in sync for
no gain.

The first tag is `Gut–brain & non-pharm therapies` with an **en dash** (U+2013)
in "Gut–brain" and an ordinary hyphen in "non-pharm", copied from the IA. Phase
1's standing rule is that identifiers print verbatim, and a dash that decayed to
a hyphen would not be caught by any other assertion, so
`schemas/lib/topics.test.ts` pins it explicitly.

## 6. `resource` has no slug

The IA gives `publication` its own page and says nothing of the sort for
`resource`, which appears as a block on the Resources page. It also says the type
"launches with exactly one item" and to "not pad" it. So no slug field, and no
`/resources/[slug]` route. Phase 3 can add both if it decides resources need
their own pages — it is an additive change.

## 7. `plugins/settings.tsx` needed no change

The plan says to register `resource` "in `sanity.config.ts` and the Studio
structure in `plugins/settings.tsx`". Only the first was necessary.
`pageStructure`'s `defaultListItems` already lists every document type that is
not a singleton, `profile`, `roleGroup` or a media tag, so `resource` appears in
the Studio sidebar as soon as it is in the schema. Adding it explicitly would
have produced a duplicate entry.

## 8. The roleGroup migration already exists

Phase 2's migration list includes "roleGroup population". That script is already
in the repo — `scripts/backfill-profile-role-groups.ts`, with its mapping table
in `scripts/roleGroupMapping.ts` and tests beside it. It is dry-run by default
and does what this phase asks for. Writing a second one would have been a
duplicate, so it is left alone.

## 9. The tag backfill never guesses

`agreed-ia.md` §4 identifies each paper by shorthand — "TREM2 '22", "Carnosic
acid '23" — not by `_id` or full title. `scripts/publicationTopics.ts` therefore
matches on publication year **plus** a distinctive title keyword. Neither alone
is sufficient: seven of the nineteen papers are from 2020, and the two FMT papers
share their keyword and are separated only by year.

The script writes a tag only where exactly one rule matches. A paper matching no
rule, a paper matching several, and a rule matching no paper are all printed for
a human to settle. That last case is the important one — it is how a changed
title or a wrong keyword announces itself instead of passing silently.

This matters because the failure modes are not symmetric. Leaving a paper
untagged is safe and the IA explicitly allows it; putting the wrong topic on a
real paper is a factual error on a public academic record. Papers that already
carry topics are never overwritten.

## 10. The PI script creates the profile but does not flip the switch

`scripts/create-pi-profile.ts` creates the `profile` document and copies the bio
from the "About Dr Damian Holsinger" pseudo-project's `description`, so the
published wording is preserved rather than retyped.

It stops short of setting `settings.labHead`. That reference is what turns on the
spotlight on the live People and Home pages, and doing it in the same
non-interactive step as creating the document would publish an unread,
portraitless profile to the site. The script prints the three remaining manual
steps instead. It is idempotent — if a profile matching the PI's name or slug
already exists it reports and exits.

## 11. What could not be verified here, and why

`npm run build` and `npm run test:e2e` **cannot run in this cloud session**. The
environment's network policy does not include `j3f9z8os.api.sanity.io` in its
egress allowlist, and the build fetches from Sanity at build time:

```
Host not in allowlist: j3f9z8os.api.sanity.io.
Add this host to your network egress settings to allow access.
  → Failed to collect page data for /projects/[slug]
```

This is an environment limit, not a defect in the change — the same build is
green in CI on the PR, which is where it should be judged. To run it in a cloud
session, add `j3f9z8os.api.sanity.io` (and `cdn.sanity.io` for images) to the
environment's egress allowlist.

What this does and does not leave uncovered:

- The **query layer is well covered without a build.** `npm run typegen` parses
  every GROQ query against the extracted schema and generates result types from
  it. The new `PublicationsQueryResult` came back with `type: 'Article' | 'Case
report' | 'Review' | null` and `resources: Array<{ kind: 'dataset' |
'hardware' | 'protocol' | 'software' | null }>` — those literal unions are
  proof the schema and the queries agree, since they can only come from the
  schema definitions.
- **Nothing in this phase renders**, so Phase 1's "empirical CSS proof" rule has
  no work to do here. No component, stylesheet or Tailwind class was touched.
- The genuine gap is **whole-app integration**: that the extra fields in
  `publicationFields` do not break a route that consumes `PublicationPayload`.
  `npm run type-check` covers this statically and is clean — it is what caught
  the one real instance, §12.
- The three migration scripts were **smoke-tested to the network boundary**: each
  now loads its full module graph and fails only on the blocked host. That is
  how §13 was found. Their read/write behaviour against real data is unverified
  and must be exercised by a human dry run.

## 12. One existing test needed updating

`PublicationPayload` is `PublicationsQueryResult[number]`, so adding fields to
the projection widened it, and `makePublication` in `lib/json-ld.test.ts` no
longer satisfied it. The fixture gained explicit nulls (`slug`, `type`, `topics`,
`featured`) and `resources: []` — following the convention already documented
around `fallbackSettings` in `types/index.ts`, which prefers explicit nulls over
loosening a payload type. No production code changed.

## 13. Two bugs the checks caught, worth knowing about

**The shared GROQ fragment could not be `groq`-tagged.** `publicationFields` is
interpolated into four queries. Tagging it `` groq`…` `` made
`sanity typegen` try to evaluate a bare projection body as a standalone query:

```
Error while evaluating query from variable 'publicationFields':
Syntax error in GROQ query at position 5: Unexpected end of query
```

The 16 real queries still generated, so this surfaced only as
"Encountered errors in 1 file" — easy to scroll past, and a permanent error in
the output of a command whose baseline was clean. Fixed by making the fragment a
plain template literal; typegen resolves the interpolation either way.

**An extensionless import broke a script but nothing else.**
`publicationSlug.ts` imported `'./slug'`, which Next, vitest and `tsc` all
resolve happily. The backfill scripts run under plain `node`, whose ESM resolver
does not do extensionless lookup, so `backfill-publication-slugs.ts` died with
`ERR_MODULE_NOT_FOUND` while every other check stayed green. This is why the
existing scripts write `'../lib/doi.ts'` with the extension. Any module reachable
from `scripts/` needs explicit extensions, and no automated check in this repo
enforces that.

## Carried into Phase 3

- Tighten `publication.slug` to `required()` once the backfill has run.
- Decide whether `resource` needs its own route and slug.
- The four migrations all still need a human dry run against the live dataset,
  then `--commit`. Nothing in this phase has touched live content.
- `settings.labHead` still needs setting by hand after the PI profile exists.
