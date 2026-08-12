# Admin-Editable Role Group Taxonomy

**Date:** 2026-08-12
**Status:** Approved; ready for planning
**Relationship to the phase programme:** Not a numbered phase. Phase 3 (3A/3B/3C) is complete and
this is not part of its own scope — it grew out of a follow-up conversation about Phase 3B's
deferred `roleGroup` backfill (see `2026-08-11-phase-3-foundations-design.md` §1.2 and §3a, and
`2026-08-11-phase-3b-studio-doi-rolegroup.md`). Treated as its own small, independently shippable
piece of work, same methodology as every phase before it (worktree, `subagent-driven-development`,
whole-branch review before merge).

---

## 1. Problem

Phase 3B shipped `profile.roleGroup` as a `string` field with a hardcoded 7-item `options.list`
(`schemas/documents/profile.ts`) — provisional values (Lab Head, Research Scientist, PhD Student,
Honours Student, Research Student, Undergraduate, Alumni) inferred from the live dataset's
composition, explicitly flagged as needing the lab's confirmation before backfilling any profile
(design doc §3a). As of 2026-08-12, `roleGroup` is still unset on all 19 profiles — that
confirmation step never happened, because a better question surfaced first: **should the lab be
able to define/rename/reorder these categories themselves, in Studio, without a developer?**

The current design can't do that — the option list is a literal array in code
(`schemas/documents/profile.ts:50-58`, duplicated in `components/pages/people/groupByRoleGroup.ts`
by comment-enforced convention). Adding, renaming, or reordering a category means a code change and
a redeploy, every time the lab's composition changes.

## 2. Decision

Move the taxonomy into content: a new `roleGroup` document type, editable in Studio, referenced from
`profile`. This is not a new pattern for this repo — it reuses the exact orderable-list mechanism
already shipped for People (`plugins/settings.tsx`'s `orderableDocumentListDeskItem` +
`@sanity/orderable-document-list`'s `orderRankField`/`orderRankOrdering`), applied to a new small
document type instead of `profile` itself.

Rejected alternative: keep `roleGroup` a plain string and source a Studio dropdown's options
dynamically from a single settings array. This needs a bespoke custom Studio input component (Sanity
doesn't support data-driven `options.list` out of the box) for strictly less capability than a
reference — no per-category document, no free searchable picker, no inline "create new." More
engineering for a worse result; not pursued further.

## 3. Design

### 3.1 Schema

`schemas/documents/roleGroup.ts` (new):

```ts
defineType({
  type: 'document',
  name: 'roleGroup',
  title: 'Role Groups',
  icon: TagIcon, // from '@sanity/icons/Tag' -- confirmed present in node_modules; UserIcon is already used by `profile`
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: 'roleGroup' }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'title' } },
})
```

`schemas/documents/profile.ts`'s `roleGroup` field changes from:

```ts
type: 'string',
options: { list: [...7 hardcoded values...], layout: 'dropdown' },
```

to:

```ts
type: 'reference',
to: [{ type: 'roleGroup' }],
```

This is a field **type** change, not a purely additive one — flagged because Phase 2 explicitly
ruled out content-model changes and Phase 3 only reopened the door for *additive, optional* ones
(§3a of the Phase 3 foundations doc). It's safe here specifically because `roleGroup` is unset on
0/19 live profiles (reconfirmed 2026-08-12) — there is no existing string data to lose or migrate.
**This plan must reconfirm that count is still 0 immediately before the schema change lands**, the
same "verify against live data, not the last snapshot" discipline every prior phase has needed.

Register `roleGroup` in `sanity.config.ts`'s `schema.types`.

### 3.2 Studio structure

`plugins/settings.tsx`'s `pageStructure` gets a second `orderableDocumentListDeskItem` call for
`roleGroup` ("Role Groups"), placed near the existing "People" one. `roleGroup` also needs excluding
from `defaultListItems` the same way `profile` already is (line 90's `listItem.getId() !== 'profile'`
grows a second exclusion), so it isn't listed twice.

The reference field on `profile` gets Sanity's built-in searchable reference picker automatically —
no custom input component. Editors can create a new `roleGroup` document inline from that picker, or
manage the full list (add/rename/reorder/delete) from the "Role Groups" desk entry.

### 3.3 Reader side

`lib/sanity.queries.ts`:
- New `roleGroupQuery`: `*[_type == "roleGroup"] | order(orderRank) { _id, title }`.
- `profileQuery`'s `roleGroup` line becomes `roleGroup->{_id, title}` (dereference instead of bare
  field).

`components/pages/people/groupByRoleGroup.ts`: drop the hardcoded `ROLE_GROUPS` const. The function
takes the live ordered group list as a parameter:

```ts
export function groupByRoleGroup<T extends { roleGroup?: { _id: string; title: string } | null }>(
  profiles: T[],
  roleGroups: { _id: string; title: string }[]
): RoleGroupSection<T>[]
```

Sections are built from `roleGroups` (already ordered by the query), keyed by `_id`. "Other" catches
both unset `roleGroup` and dangling references (a group deleted after being assigned — Sanity
dereferences a missing document to `null`, same as unset). Empty sections stay omitted, matching the
existing behaviour.

`app/people/page.tsx` fetches `roleGroupQuery` alongside `profileQuery` (parallel, same
`Promise.all` this file already uses) and passes both to `groupByRoleGroup`.

Regenerate `sanity.types.ts` via the existing `npm run typegen` — mechanical, no new tooling.

### 3.4 Backfill script

`scripts/backfill-profile-role-groups.ts` (new), same dry-run-by-default shape as
`scripts/backfill-publication-dois.ts`: reads all `roleGroup` documents (by `title`) and all
profiles (by `role`), maps profiles to groups via a hardcoded lookup table derived from the mapping
already worked out against the live 19 `role` strings (2026-08-12):

| `role` (exact string) | → `roleGroup` title |
|---|---|
| `Research Scientist` (×2) | Research Scientist |
| `PhD Student` | PhD Student |
| `Honours Student (BioMedEng)`, `Honours Student (Biomedical Engineering)`, `Honours student (Biomed Eng)`, `Honours student (Diagnostic Radiography)` | Honours Student |
| `Research Student - BSc/MD`, `Research Student - MD (UNSW)`, `Research Student - MDiagRad` | Research Student |
| `BAppSci (Diagnostic Radiography)`, `BAppSci (Speech Pathology)`, `BSc (Medical Sciences)`, `Ungergraduate student - Diagnostic Radiography` | Undergraduate |
| `Study Abroad Student` | *unresolved — see §5* |

The script fails loudly (not silently skips) if a `roleGroup` title it needs doesn't exist yet in
Studio, since it depends on the manual seeding step (§3.5) having happened first.

### 3.5 Explicitly not scripted

Creating the initial `roleGroup` documents themselves (Lab Head, Research Scientist, etc.) is a
manual Studio task, not a script. `@sanity/orderable-document-list` computes rank values internally
when documents are created/reordered through its own Studio UI; there's no supported way to
pre-compute correct ranks from a standalone script, and faking them risks producing an
inconsistent order that only a Studio reorder can fix. Creating 7 documents by hand takes a couple
of minutes and is exactly the task this feature exists to hand to the lab — scripting it would
undercut the point.

## 4. Sequencing

1. Ship the code (schema, Studio structure, query/grouping changes, backfill script) as one
   worktree/PR, same as every prior sub-phase.
2. A human with Studio access creates the initial `roleGroup` documents (the 7 above, or whatever
   the lab actually wants — nothing forces the provisional list once this ships).
3. Run the backfill script (dry-run first) to link the 19 profiles.

Nothing in step 1 depends on steps 2 or 3 happening — `/people` must render correctly (single
"Other" section, current behaviour) with zero `roleGroup` documents and zero profiles linked, same
"degrades gracefully when unset" bar every Phase 3 field met.

## 5. Open item

`Study Abroad Student` (Fritz Graham) doesn't cleanly match any of the 7 provisional categories.
Two options, both fine: bucket him under **Research Student**, or leave his `roleGroup` unset (he
renders under "Other," which already works). **Decision needed before the backfill script's lookup
table is finalised — not a blocker for shipping the code itself.**

## 6. Testing

- `groupByRoleGroup.test.ts` rewritten for the new signature: ordered-groups-as-parameter, "Other"
  for unset/dangling, empty-section omission — same cases as today, adapted to the new shape.
- Backfill script: unit tests over the lookup table logic against the real 19 `role` strings
  (captured above), same "test against real data, not invented fixtures" discipline as the DOI
  script.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm test`, `npm run test:e2e` green.
- Existing `e2e/publications-interactive.spec.ts` "single Other section" assertion should still pass
  right after merge (step 1, before steps 2/3 populate any data) — worth an explicit check that it
  wasn't accidentally coupled to the old string-based shape.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Field type change (string → reference) on `roleGroup` | Safe only because 0/19 profiles have it set today. This plan must re-verify that count immediately before the schema change, not trust this document's 2026-08-12 snapshot. |
| Lab creates a `roleGroup` document with a typo or duplicate title | Not prevented by schema (no uniqueness constraint on `title`). Low stakes — same fix as any Studio content typo, edit the document. Not worth a validation rule for a ~7-item list one lab manages. |
| Backfill script's lookup table goes stale the moment a new profile is added with a new `role` string | Same shape as the DOI script's limitation — it's a one-off/re-runnable tool, not a live sync. Future new profiles get `roleGroup` set by hand in Studio via the reference picker, which is now trivial (searchable dropdown), not a script's job. |

## 8. Out of scope

- Re-litigating the 7 provisional category names — this document only changes *how* categories are
  defined (code vs. Studio), not what they currently are. The lab can rename/add/remove after this
  ships, without needing another code change.
- Any change to `profile.role` (the free-text display string) or its normalisation — untouched,
  same as Phase 3B/3C.
