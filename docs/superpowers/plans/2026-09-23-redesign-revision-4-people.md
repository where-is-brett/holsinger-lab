# Redesign revision PR 4 — People, PI profile, Research, Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the revision's last four screens:

- People becomes one continuous card grid with group labels, a quiet initials tile and an alumni name list.
- The PI profile lists the person's publications and gets an email button.
- Research drops its tag-as-label and counts only projects with text.
- Contact is rebuilt on the redesign shell, with the `settings.contact` details beside the existing Formspree form.

**Architecture:** Pure, unit-tested helpers do all the data shaping:

- `publicationModel.ts` gets a token-bounded author matcher: `findAuthorToken`, `hasAuthor`, `publicationsByPerson` and `countPublicationsByPerson`.
- `peopleModel.ts` gets `surnameOf`, `flattenMembers`, `roleLine` and `profileSaysMore`.
- `researchModel.ts` gets `hasBodyText` and `countProjectsWithBody`.
- A new `contactModel.ts` holds `contactDetails`, `telHref` and the University constant.

The screens (`People`, `PersonPage`, `Research` and a new `Contact`) only compose those helpers. Routes fetch and pass. States the live data can't reach are gallery fixtures on `/preview/components`.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Sanity (GROQ + TypeGen), Tailwind 4, Headless UI 2.2.10 `Dialog`, Vitest, Playwright (projects `chromium`, `mobile-safari` = iPhone 13 WebKit, `mobile-chrome` = Pixel 7), axe.

**Spec:** `docs/superpowers/specs/2026-09-23-redesign-revision-design.md` §"PR 4 — People, PI profile, Research, Contact". Also read these parts of `docs/redesign-experiment/phase-3-decisions.md`:

- "Deferred to PR 2–4": finding 11 has a People instance, which Task 3 closes.
- "Revision PR 1" and "Revision PR 2", for the shipped conventions.
- The PR 3 plan (`docs/superpowers/plans/2026-09-23-redesign-revision-3-publications.md` on `redesign/revision-publications`), for what is landing alongside this PR.

**Base:** branch `redesign/revision-people`.

- **At execution time,** re-create or rebase it off the **current** `origin/redesign/integration` head, not `f60dd70` (where this plan was written).
- **If PR 3 (`redesign/revision-publications`) has merged by then,** start from that merge.
- **If PR 3 hasn't merged,** start anyway. Nothing in this plan needs PR 3's code; see "Dependency on PR 3" below.

### Dependency on PR 3 (read before Task 1)

- **The author matcher.** The spec calls PR 4's matcher "the PR 3 matcher, generalised". PR 3's plan doesn't implement the spec's "Author bolding matches only the PI's name token" bullet. `splitAuthors` on `redesign/integration` is still PR 2's comma/boundary splitter (commit `fd02946`). It extends past the initials when no comma follows ("Holsinger RMD Smith J" bolds the whole run).
  - **So Task 1 implements the token matcher itself.** It covers PR 3's bullet too; tell the command centre so PR 3 doesn't build a second one.
  - **If PR 3 has landed its own token matcher by the time Task 1 starts,** keep PR 3's `splitAuthors` behaviour and tests. Implement `findAuthorToken` on top of it, and keep this task's new cases only where they don't contradict PR 3's.
- **Textual conflicts to expect** if PR 3 merges while this branch is open:
  - `app/preview/components/Gallery.tsx` (PR 3 deletes the facet-band section and adds a filter-bar section);
  - `e2e/redesign-components.spec.ts` (`GALLERY_SECTIONS`);
  - `components/redesign/publicationModel.test.ts` (PR 3 renames one `shortenLabel` test).

  Resolve by keeping both sides' additions. None of them overlap semantically.
- **`Button`.** PR 3 adds `variant="primary"` and `external` to `Button`. This plan uses only the existing default (hairline) variant with `href`, so it doesn't depend on PR 3. The email button is a secondary action, and the hairline variant is the right weight for it.
- **`PublicationRow`.** PR 3 removes its `density` prop. This plan renders `<PublicationRow pub={pub} href={pub.href} />` only, which is valid before and after PR 3.

## Global Constraints

- **Git and data:**
  - Never write to any Sanity dataset (reads through `e2eClient` or the public API are fine).
  - Never touch `main`, and don't push or merge.
  - Never use bare `git stash`. If you must stash, use `git stash push -u -m "<unique-tag>"`, restore by SHA with `git stash apply <sha>`, and drop it by tag.
  - Never run `npm audit fix --force`.
- **Schema:** no schema changes. `settings.contact` already has `email`, `phone` and `address` (`schemas/singletons/settings.ts`). Only the GROQ projection widens.
- **e2e must hold for any valid dataset.**
  - Derive every expectation from `e2eClient` (`e2e/support/sanity.ts`, which reads `lib/sanity.api.ts`'s env), or from the gallery fixtures (`app/preview/components/Gallery.tsx`, `components/redesign/fixtures.ts`). Never hardcode a count, a name or a "field is unset" assumption.
  - Import the same pure helper the page uses (`countPublicationsByPerson`, `profileSaysMore`, `contactDetails`, `countProjectsWithBody`) so the test and the page can't drift.
  - A test that needs a width sets it (`page.setViewportSize`). No project-name skips.
- **e2e never reaches Formspree.** Every test that submits the contact form intercepts `**/api/formspree` with `page.route` first.
- **Tailwind 4:**
  - Never put two utilities that set the same property at the same breakpoint on one element; use one class string per shape.
  - Use `h-(--x)` for a bare custom property.
  - Base CSS rules are unlayered, so overriding them needs `!` (e.g. `mb-0!` against `p:not(:last-child)`).
  - Prove every new utility with `npm run css:proof -- --grep '<class selector>'`, which exits 0 on a match.
- **WebKit:** no unspaced `calc(`. WebKit drops the whole declaration.
- **Grid overflow:** a text grid item needs an explicit track below its breakpoint (`grid-cols-1`). Unbreakable CMS tokens need `break-words`, or `break-all` for identifiers and emails.
- **Label budget:** ≤ 6 shouted labels per page at 1440 and 375 (`e2e/label-budget.spec.ts`).
  - New labels are sentence-case Archivo (`MICRO_LABEL` in `components/redesign/tokens.ts`).
  - CMS text carries `data-cms-verbatim`.
  - Identifiers carry `data-identifier` and `data-cms-verbatim`.
- **CMS text prints verbatim:** a role, a group title or an address is never re-cased or corrected.
- **Keep these green:** `e2e/typography.spec.ts`, `e2e/section-label.spec.ts`, `e2e/preview-scrollbar.spec.ts`, `e2e/axe.spec.ts` (light and dark), fixture-level axe in `e2e/redesign-components.spec.ts`, and no horizontal overflow from 320 to 1440px.
- **Comments** state the current reason only: no task numbers, review rounds or history. History goes in `phase-3-decisions.md`.
- **Implementation subagents are Sonnet-only.** Review and verify subagents may use other tiers.
- **Local e2e:**
  - `:3000` belongs to another worktree. Create an **untracked** `playwright.alt.config.ts` at the repo root: spread the base config, set `webServer.command: 'npm run build && npx next start -p 3100'`, `webServer.url` and `use.baseURL` to `http://localhost:3100`, and `reuseExistingServer: false`. **Delete it before every commit.**
  - Before each run: `rm -rf .next/cache/fetch-cache`.
  - After each build: `git checkout origin/redesign/integration -- next-env.d.ts`, and delete any generated `AGENTS.md`/`CLAUDE.md`.
- **Gates per task:**
  - `npm run type-check`;
  - `npm run lint` (baseline 0 errors, 4 warnings; add none);
  - `npx vitest run`;
  - `npm run build`;
  - `npx playwright test -c playwright.alt.config.ts` on all three projects.
- **Commit trailer:** `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings this plan takes (record them in the decisions doc, Task 5)

1. **Research sections carry no label** (a deviation from the spec's letter; **needs command-centre confirmation before Task 4**).
   - **Why not the literal reading.** The spec says "Section labels are the project's title, not its first tag". But each project section already renders the title as its heading-size `<h2>`.
     - A label repeating the title prints it twice: side by side from `lg`, and stacked below `lg`. The stacked case is the finding-11 "label above same-text" defect again.
     - Dropping the `<h2>` instead demotes every project title to a 13px muted label. It also stacks that label directly above the 13px muted kicker, which is finding 11 again.
   - **The ruling.** Remove the tag label and pass no label. The project's `<h2>` stays the section's one name.
   - **Cost if wrong:** one line (`label={project.title}` on the project `Section`), plus deleting the `<h2>` and flipping one e2e assertion.
2. **The matcher is token-bounded and case-sensitive.**
   - A surname matches only as a whole word: no letter, mark, apostrophe or hyphen on either side. "Ng" doesn't match "Ngo", "Holsinger" doesn't match "Holsinger-Smith", and "Wang" never contains "Ng".
   - It extends only over initials in any format (`R.M.D.`, `RMD`, `R M D`, `R.M.D`, `Q-S.`), optionally after a comma. It never extends into a following name.
   - No lookbehind: older WebKit lacks it, and the gallery runs this code client-side.
3. **A person's surname is the last word of their name**, after a leading honorific, parenthesised words ("(DDS)", "(Sree)") and trailing suffixes (Jr, Sr, II–IV, PhD) are dropped. A lone honorific gives no surname, and no surname means no publications.
   - **Known limit:** multi-word surnames ("Van Der Berg") match and bold on the last word only.
   - **Known limit:** short, common surnames (Ng, Wu, Kim) could over-match co-authors who aren't lab members. Only `hasPage` profiles and the spotlighted lab head are ever matched, and today that's the PI alone.
4. **The profile page bolds the profile's own surname,** not always the PI's (`toPublicationFor(surname)`). `toPublication` keeps its one-argument signature, because two routes pass it straight to `Array.map`.
5. **The spotlight shows the short `bio` when one is set, else `fullBio`.** The profile page keeps showing `fullBio`, else `bio`.
   - This is what makes the spec's "fullBio differs from bio" test meaningful. "The profile says more" = it has publications, or both texts are set and differ after whitespace normalisation.
   - The link text is "Profile and publications →". Production has `bio` unset today, so the spotlight text doesn't change.
6. **People cards:** the group label (the role group's CMS title, verbatim) sits under the name.
   - The card's role line is dropped when it equals the group title (case-insensitive, trimmed), because wix-preview has "Research Student / Research Student" on many cards.
   - The ungrouped catch-all has no group label.
   - The "Members" section renders only when there is at least one member card.
7. **Finding 11 closed for People** by removing the two stacked inner labels: "Head of laboratory · Principal investigator" under "Lab head", and "Recent lab alumni" under "Alumni". The Members and Alumni `Section` labels become the sections' `<h2>`s, since the role-group `<h2>`s go.
8. **Alumni are a name list** (name only, linked when `hasPage`), in `orderRank` order: 1 column, then 3 from `md`, then 4 from `lg`.
9. **The quiet initials tile** is `bg-surface-raised`, with no stripe and no border, and Archivo initials in `text-text-muted` (a pair contrast-guarded in `styles/tokens.test.ts`). With a name it's `role="img"` named for the person; without one it's `aria-hidden`.
   - It applies to every `PortraitFrame`: People cards, the spotlight and the profile page.
   - `STRIPE_BG` stays for ResourceBlock and Home's 64px lab-head portrait, which this PR doesn't touch.
10. **The email button** is `Button href="mailto:…"` labelled "Send an email", with the address printed beside it as plain mono data (not a second link). The phone link stays.
11. **The Research meta** counts projects whose resolved body has non-blank plain text. A project with a blank body still renders its section. `resolveBody` itself is unchanged.
12. **Contact:**
    - one `Section` with no label, so there's no stacked-label pair above "Email";
    - details left, form right from `lg` (`[1fr | 1.6fr]`), details first below `lg`;
    - each detail row renders only when its trimmed value is set;
    - the address keeps its line breaks (`whitespace-pre-line`);
    - "The University of Sydney" links to the constant `https://www.sydney.edu.au/`, same tab.
13. **Contact form behaviour unchanged:**
    - same `/api/formspree` POST, and the same JSON payload `{ name, email, message, _gotcha }`;
    - same honeypot;
    - same success and error strings;
    - same "stays submitting until the error dialog is closed".

    Restyled only:
    - `FormField` inputs;
    - an inverse-ink submit button;
    - the Storyset illustration dropped (`public/success.svg` deleted once unreferenced);
    - the error dialog on Headless UI `Dialog`, titled "Submission failed".
14. **Legacy fonts stay.** After the old Contact form is deleted, Ariana, Antarctican Mono and PT Serif all still have consumers (`TimelineItem`, `Header`, `Page`, `ProjectPage`, `Logo`), so no face is removed. Task 5 re-greps and records the result.
15. **Revalidation:** a `publication` webhook now also revalidates `/people` and every `/people/[slug]` page, and a `profile` webhook revalidates every `/people/[slug]` page. Both screens now depend on publications.

## Review Focus

1. **Surname collisions.** A surname that is a prefix or substring of another author ("Ng" and "Ngo H.", "Holsinger" and "Holsingerova A." / "Holsinger-Smith A.") must not credit the person. Pinned by Task 1's `hasAuthor` unit tests.
2. **Names that aren't "First Last".** "Dr Johnny Chan (DDS)", "Zeyi (Brett) Yang", "Martin Luther King Jr.", "Smith, Jr.", a single word, a lone "Dr", or an empty name must each give the right surname or `null`. `null` must mean no Publications section and a count of 0, never a crash or a match-everything empty pattern. Pinned by Task 1's `surnameOf`/`countPublicationsByPerson` unit tests.
3. **The spotlight link when the texts only look different.** A whitespace-only `bio`, a `bio` unset while `fullBio` is set, or a `fullBio` equal to `bio` apart from spacing must all hide the link when there are no publications. Pinned by Task 3's `profileSaysMore` unit tests and the gallery (c) instance.
4. **Partial or missing contact details.** Production has `settings.contact = null` today, and a record can have only an email, a whitespace-only phone, or a multi-line address. The page must render only the rows that exist: no empty `<dd>`, no `tel:` for a blank phone, line breaks kept, and the University link always there. Pinned by Task 5's `contactDetails` unit tests plus the `gallery-contact` and `gallery-contact-empty` e2e.
5. **A research body that is present but blank** (a block whose spans are empty or whitespace, e.g. an editor who cleared the text) must not count as an "active project". The project's section must still render. Pinned by Task 4's `hasBodyText` unit tests and the `gallery-research-empty-bodies` e2e.

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `components/redesign/publicationModel.ts` (+ test) | `findAuthorToken`, `hasAuthor`, token-based `splitAuthors`, `toPublicationFor`, `publicationsByPerson`, `countPublicationsByPerson` | 1 |
| `components/redesign/peopleModel.ts` (+ test) | `surnameOf` (Task 1); `flattenMembers`, `MemberCard`, `roleLine`, `profileSaysMore` (Task 3) | 1, 3 |
| `components/redesign/screens/PersonPage.tsx` | Publications (n) section, email button, `headingLevel` | 2 |
| `app/people/[slug]/page.tsx` | fetch publications, pass `publicationsByPerson` | 2 |
| `app/api/revalidate/route.ts` (+ test) | the publication and profile webhooks also revalidate the people pages | 2 |
| `components/redesign/PersonCard.tsx` | quiet initials tile; optional `group`; optional `role` | 3 |
| `components/redesign/screens/People.tsx` | continuous grid, alumni list, spotlight rule | 3 |
| `lib/sanity.queries.ts`, `sanity.types.ts` | `publicationAuthorsQuery` (Task 3); `settingsQuery` contact fields (Task 5) | 3, 5 |
| `app/people/page.tsx` | fetch authors, pass `labHeadPublicationCount` | 3 |
| `components/redesign/researchModel.ts` (+ test), `screens/Research.tsx` | drop `label`; `hasBodyText`, `countProjectsWithBody` | 4 |
| `components/redesign/contactModel.ts` (+ test) (new) | `contactDetails`, `telHref`, `UNIVERSITY_URL`, `UNIVERSITY_NAME` | 5 |
| `components/redesign/ContactForm.tsx` (new), `screens/Contact.tsx` (new), `FormField.tsx` | the restyled form and the screen | 5 |
| `app/contact/page.tsx`; delete `components/pages/contact/*`, `public/success.svg` | route on the redesign shell | 5 |
| `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx` | fixtures and gallery instances | 2–5 |
| `e2e/*.spec.ts` (listed per task) | behaviour | 2–5 |
| `docs/redesign-experiment/phase-3-decisions.md`, `preview-walkthrough.md`, the spec | decisions | 5 |

---

### Task 1: Token-bounded author matcher and `surnameOf`

**Files:**
- Modify: `components/redesign/publicationModel.ts`
- Modify: `components/redesign/peopleModel.ts`
- Test: `components/redesign/publicationModel.test.ts`, `components/redesign/peopleModel.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (Tasks 2 and 3 rely on these exact names):

```ts
// components/redesign/peopleModel.ts
export function surnameOf(name: string | null | undefined): string | null

// components/redesign/publicationModel.ts
export function findAuthorToken(authors: string, surname: string): { start: number; end: number } | null
export function hasAuthor(authors: string, surname: string): boolean
export function splitAuthors(authors: string, surname?: string): { pre: string; pi: string; post: string } // default 'Holsinger'
export function toPublication(p: PublicationPayload): Publication // unchanged signature
export function toPublicationFor(surname: string): (p: PublicationPayload) => Publication
export function publicationsByPerson(pubs: PublicationPayload[], name: string | null | undefined): Publication[]
export function countPublicationsByPerson(authors: (string | null)[], name: string | null | undefined): number
```

- [ ] **Step 1: Write the failing `surnameOf` tests.** Add `surnameOf` to the import list at the top of `components/redesign/peopleModel.test.ts`, and append:

```ts
describe('surnameOf', () => {
  it.each([
    ['Damian Holsinger', 'Holsinger'],
    ['  Damian   Holsinger ', 'Holsinger'],
    ['Dr Johnny Chan (DDS)', 'Chan'],
    ['Dr. Rossana R Porto', 'Porto'],
    ['Zeyi (Brett) Yang', 'Yang'],
    ['Sreevadana (Sree) Venkitachalam', 'Venkitachalam'],
    ['Deepikaa V. G. Sandanababu', 'Sandanababu'],
    ['Martin Luther King Jr.', 'King'],
    ['Smith, Jr.', 'Smith'],
    ['Élodie Ñúñez', 'Ñúñez'],
    ['Dr Chan', 'Chan'],
    ['Plato', 'Plato'],
  ])('%j -> %j', (name, surname) => {
    expect(surnameOf(name)).toBe(surname)
  })

  it.each([[null], [undefined], [''], ['   '], ['Dr'], ['Prof.'], ['(DDS)']])('%j has no surname', (name) => {
    expect(surnameOf(name)).toBeNull()
  })
})
```

- [ ] **Step 2: Write the failing matcher tests.** In `components/redesign/publicationModel.test.ts`, add `countPublicationsByPerson`, `findAuthorToken`, `hasAuthor`, `publicationsByPerson` and `toPublicationFor` to the import list. Append these to the existing `describe('splitAuthors', …)` block:

```ts
  it('never extends past the initials when no comma follows', () => {
    const r = splitAuthors('Holsinger RMD Smith J')
    expect(r.pi).toBe('Holsinger RMD')
    expect(r.post).toBe(' Smith J')
  })

  it('bolds another surname when asked', () => {
    const r = splitAuthors('Wang Y., Ng J. and Holsinger R.M.D.', 'Ng')
    expect(r).toEqual({ pre: 'Wang Y., ', pi: 'Ng J.', post: ' and Holsinger R.M.D.' })
  })

  it('does not match inside a longer name', () => {
    expect(splitAuthors('Holsingerova A., Smith J.').pi).toBe('')
  })
```

Then add new blocks after it. The first list is every format of the PI's name present in the production and wix-preview datasets on 2026-09-23, plus the spec's four initials formats:

```ts
describe('findAuthorToken', () => {
  it.each([
    ['Holsinger R.M.D.', 'Holsinger R.M.D.'],
    ['Holsinger RMD.', 'Holsinger RMD.'],
    ['Holsinger RMD, Glaum J.', 'Holsinger RMD'],
    ['Holsinger RMD, Kril JJ, Halliday GM.', 'Holsinger RMD'],
    ['Holsinger R.M.D., Kiang K.M.', 'Holsinger R.M.D.'],
    ['Holsinger R.M.D. and Neely G.', 'Holsinger R.M.D.'],
    ['Holsinger, R.M.D.', 'Holsinger, R.M.D.'],
    ['Holsinger, R.M.D. and Smith, J.', 'Holsinger, R.M.D.'],
    ['Holsinger, RMD.', 'Holsinger, RMD.'],
    ['Holsinger, RMD., Parmar, A.', 'Holsinger, RMD.'],
    ['Holsinger R M D, Smith J.', 'Holsinger R M D'],
    ['Holsinger R.M.D, Smith J.', 'Holsinger R.M.D'],
    ['Holsinger, Q-S.; X, Y.', 'Holsinger, Q-S.'],
    ['Holsinger, Damian', 'Holsinger'],
  ])('%j bolds %j', (authors, run) => {
    const token = findAuthorToken(authors, 'Holsinger')
    expect(token).not.toBeNull()
    expect(authors.slice(token!.start, token!.end)).toBe(run)
  })

  it('finds a later whole-word match after a rejected partial one', () => {
    const authors = 'Holsingerova A. and Holsinger R.M.D.'
    const token = findAuthorToken(authors, 'Holsinger')
    expect(authors.slice(token!.start, token!.end)).toBe('Holsinger R.M.D.')
  })

  it('treats regex metacharacters in a surname literally', () => {
    expect(findAuthorToken('AxB C.', 'A.B')).toBeNull()
    expect(findAuthorToken('A.B C.', 'A.B')).not.toBeNull()
  })
})

describe('hasAuthor', () => {
  it('matches a whole-word surname', () => {
    expect(hasAuthor('Wang Y., Ng J.', 'Ng')).toBe(true)
  })

  it.each([
    ['Ngo H., Wang Y.', 'Ng'],
    ['Holsinger-Smith A.', 'Holsinger'],
    ['Smith-Holsinger A.', 'Holsinger'],
    ["O'Holsinger A.", 'Holsinger'],
    ['holsinger r.m.d.', 'Holsinger'],
  ])('%j does not credit %j', (authors, surname) => {
    expect(hasAuthor(authors, surname)).toBe(false)
  })

  it('never matches a blank surname', () => {
    expect(hasAuthor('Holsinger R.', '   ')).toBe(false)
    expect(hasAuthor('', '')).toBe(false)
  })
})

describe('publicationsByPerson / countPublicationsByPerson', () => {
  const a = payload({ _id: 'a', author: 'Wang Y., Ng J. and Holsinger R.M.D.' })
  const b = payload({ _id: 'b', author: 'Ngo H. and Holsinger R.M.D.' })
  const c = payload({ _id: 'c', author: null })

  it('keeps only the papers carrying the surname token, bolding that surname', () => {
    const rows = publicationsByPerson([a, b, c], 'Dr Johnny Ng')
    expect(rows.map((r) => r.id)).toEqual(['a'])
    expect(rows[0].authorsPI).toBe('Ng J.')
  })

  it('returns nothing for a name with no surname', () => {
    expect(publicationsByPerson([a, b], 'Dr')).toEqual([])
    expect(publicationsByPerson([a, b], null)).toEqual([])
  })

  it('counts author strings the same way', () => {
    expect(countPublicationsByPerson([a.author, b.author, null], 'Damian Holsinger')).toBe(2)
    expect(countPublicationsByPerson([a.author, b.author], 'Johnny Ng')).toBe(1)
    expect(countPublicationsByPerson([a.author], '')).toBe(0)
  })
})

describe('toPublicationFor', () => {
  it('bolds the given surname; toPublication still bolds the PI', () => {
    const p = payload({ author: 'Wang Y., Ng J. and Holsinger R.M.D.' })
    expect(toPublicationFor('Ng')(p).authorsPI).toBe('Ng J.')
    expect(toPublication(p).authorsPI).toBe('Holsinger R.M.D.')
  })
})
```

`payload(overrides)` is the existing `PublicationPayload` factory in this test file, used by `describe('toPublication')`. Reuse it as it is. If its `author` field has another name, adjust only the key.

- [ ] **Step 3: Run the tests to verify they fail.**

Run: `npx vitest run components/redesign/publicationModel.test.ts components/redesign/peopleModel.test.ts`
Expected: FAIL. `surnameOf`, `findAuthorToken`, `hasAuthor`, `toPublicationFor`, `publicationsByPerson` and `countPublicationsByPerson` aren't exported, and the "Holsinger RMD Smith J" case bolds the whole run.

- [ ] **Step 4: Implement `surnameOf`.** In `components/redesign/peopleModel.ts`, add `nameWords` beside `HONORIFICS` and rebuild `initialsOf` on it. Keep `initialsOf`'s existing doc comment and its behaviour, which its existing tests pin. Then add `surnameOf`:

```ts
// Generational and degree suffixes that follow a surname rather than being one.
// Compared after trailing punctuation is stripped, so "Jr." and "Ph.D." match.
const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'ph.d'])

/**
 * A name's words after NFC normalisation, minus a leading honorific (only when
 * more words follow) and any word that doesn't start with a letter, such as a
 * parenthesised qualifier "(DDS)". `\p{L}` rather than an ASCII check, so
 * accented initials count as letters.
 */
function nameWords(name: string | null | undefined): string[] {
  if (!name) {
    return []
  }
  let words = name.normalize('NFC').trim().split(/\s+/).filter(Boolean)
  if (words.length > 1 && HONORIFICS.has(words[0].toLowerCase())) {
    words = words.slice(1)
  }
  return words.filter((word) => /\p{L}/u.test(Array.from(word)[0] ?? ''))
}

export function initialsOf(name: string | null | undefined): string {
  const words = nameWords(name)
  if (words.length === 0) {
    return ''
  }
  const first = Array.from(words[0])[0] ?? ''
  const last = Array.from(words[words.length - 1])[0] ?? ''
  return (words.length === 1 ? first : first + last).toUpperCase()
}

/**
 * The surname token used to find a person's papers: the last word of the name,
 * after `nameWords`' filtering, trailing punctuation, and trailing suffixes
 * (Jr, Sr, II-IV, PhD). A lone honorific ("Dr") is not a surname. `null` means
 * "no surname", and callers must treat it as "matches nothing".
 */
export function surnameOf(name: string | null | undefined): string | null {
  const words = nameWords(name)
    .map((word) => word.replace(/[.,;:]+$/u, ''))
    .filter(Boolean)
  while (words.length > 1 && NAME_SUFFIXES.has(words[words.length - 1].toLowerCase())) {
    words.pop()
  }
  const last = words[words.length - 1]
  if (!last || (words.length === 1 && HONORIFICS.has(last.toLowerCase()))) {
    return null
  }
  return last
}
```

`HONORIFICS` holds `'dr'`, `'dr.'`, `'prof'`, `'prof.'` and `'professor'`. After the trailing-dot strip, "Prof." becomes "prof", so it's caught.

- [ ] **Step 5: Implement the matcher.** In `components/redesign/publicationModel.ts`:
  - delete `AUTHOR_TOKEN_BOUNDARY` and `INITIALS_ONLY`;
  - replace `splitAuthors` with the code below;
  - refactor `toPublication` onto `buildPublication`;
  - add `import { surnameOf } from './peopleModel'` to the imports.

```ts
const PI_SURNAME = 'Holsinger'

// A character that would make a surname match part of a longer name: a letter,
// a combining mark, an apostrophe or a hyphen.
const NAME_CHAR = /[\p{L}\p{M}'’-]/u
// One initial: a capital not followed by a lower-case letter (so "S" of "Smith"
// is never taken as an initial), with an optional dot. Initials may be joined
// by a space or a hyphen: "R.M.D.", "RMD", "R M D", "R.M.D", "Q-S.".
const INITIAL = String.raw`\p{Lu}(?!\p{Ll})\.?`
const INITIALS = String.raw`${INITIAL}(?:[\s-]?${INITIAL})*`

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Where `surname` appears in `authors` as a whole word, plus any initials that
 * follow it (after an optional comma). Case-sensitive. The start boundary is
 * checked by hand, not with a lookbehind, so the pattern also compiles on
 * WebKit versions without lookbehind support.
 */
export function findAuthorToken(authors: string, surname: string): { start: number; end: number } | null {
  const target = surname.trim()
  if (!target) {
    return null
  }
  const pattern = new RegExp(
    String.raw`${escapeRegExp(target)}(?![\p{L}\p{M}'’-])(?:(?:,\s*|\s+)${INITIALS})?`,
    'gu'
  )
  for (let match = pattern.exec(authors); match !== null; match = pattern.exec(authors)) {
    const before = Array.from(authors.slice(0, match.index)).pop()
    if (before === undefined || !NAME_CHAR.test(before)) {
      return { start: match.index, end: match.index + match[0].length }
    }
    pattern.lastIndex = match.index + 1
  }
  return null
}

export function hasAuthor(authors: string, surname: string): boolean {
  return findAuthorToken(authors, surname) !== null
}

export function splitAuthors(authors: string, surname: string = PI_SURNAME) {
  const token = findAuthorToken(authors, surname)
  if (!token) return { pre: authors, pi: '', post: '' }
  return {
    pre: authors.slice(0, token.start),
    pi: authors.slice(token.start, token.end),
    post: authors.slice(token.end),
  }
}
```

Rename the existing `toPublication` body to `buildPublication(p: PublicationPayload, surname: string): Publication`. Its only change is `splitAuthors(authors, surname)`. Then add:

```ts
export function toPublication(p: PublicationPayload): Publication {
  return buildPublication(p, PI_SURNAME)
}

/** A `toPublication` that bolds `surname` instead of the PI's -- for a person's own profile page. */
export function toPublicationFor(surname: string): (p: PublicationPayload) => Publication {
  return (p) => buildPublication(p, surname)
}

/** The papers whose author string carries this person's surname token, in the given order, bolding that surname. */
export function publicationsByPerson(pubs: PublicationPayload[], name: string | null | undefined): Publication[] {
  const surname = surnameOf(name)
  if (!surname) return []
  const toRow = toPublicationFor(surname)
  return pubs.filter((p) => hasAuthor(p.author ?? '', surname)).map(toRow)
}

/** How many author strings carry this person's surname token -- `publicationsByPerson`'s count, from authors alone. */
export function countPublicationsByPerson(authors: (string | null)[], name: string | null | undefined): number {
  const surname = surnameOf(name)
  if (!surname) return 0
  return authors.filter((a) => hasAuthor(a ?? '', surname)).length
}
```

- [ ] **Step 6: Run the tests to verify they pass.**

Run: `npx vitest run components/redesign/publicationModel.test.ts components/redesign/peopleModel.test.ts`
Expected: PASS, including every pre-existing `splitAuthors` and `initialsOf` case.

- [ ] **Step 7: Run the gates.** `npm run type-check`, `npm run lint` and `npx vitest run`. Neither the rendered output nor the e2e changes in this task, but the Holsinger bolding feeds Home and Publications. So run the full e2e as well: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts`. Expected: all pass. Then restore `next-env.d.ts` and delete `playwright.alt.config.ts`.

- [ ] **Step 8: Commit.**

```bash
git add components/redesign/publicationModel.ts components/redesign/publicationModel.test.ts components/redesign/peopleModel.ts components/redesign/peopleModel.test.ts
git commit -m "feat(publications): token-bounded author matcher and surnameOf

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PI profile — Publications (n) and an email button

**Files:**
- Modify: `components/redesign/screens/PersonPage.tsx`
- Modify: `app/people/[slug]/page.tsx`
- Modify: `app/api/revalidate/route.ts`, `app/api/revalidate/route.test.ts`
- Modify: `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`
- Test: `e2e/lab-head-spotlight.spec.ts`, `e2e/redesign-components.spec.ts`, `e2e/label-budget.spec.ts`

**Interfaces:**
- Consumes (Task 1): `publicationsByPerson`, `Publication`.
- Produces:

```ts
// components/redesign/screens/PersonPage.tsx
export function PersonPage(props: {
  person: ProfileBySlugPayload
  publications: Publication[]
  headingLevel?: 'h1' | 'h2'
}): JSX.Element
// DOM contract: Section label "Publications (n)" as <h2>, content wrapper
// data-testid="person-publications"; the email button is a link named "Send an email".

// components/redesign/fixtures.ts
export const PERSON_PAGE_FIXTURE: ProfileBySlugPayload
export const PERSON_PAGE_BARE_FIXTURE: ProfileBySlugPayload
export const PERSON_PAGE_PUBLICATIONS_FIXTURE: Publication[]
```

- [ ] **Step 1: Write the failing revalidation tests.** In `app/api/revalidate/route.test.ts`, change the publication test's expectations to:

```ts
    expect(revalidatePath).toHaveBeenCalledWith('/publications')
    expect(revalidatePath).toHaveBeenCalledWith('/publications/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/people')
    expect(revalidatePath).toHaveBeenCalledWith('/people/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledTimes(5)
```

Change the profile test's expectations to:

```ts
    expect(revalidatePath).toHaveBeenCalledWith('/people')
    expect(revalidatePath).toHaveBeenCalledWith('/people/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(3)
```

Rename both tests so their titles say why: "…because the people pages list and count publications" and "…including every profile page".

- [ ] **Step 2: Write the failing live-data e2e.** Append to `e2e/lab-head-spotlight.spec.ts`, and add the import `import { countPublicationsByPerson } from 'components/redesign/publicationModel'`:

```ts
test('each profile page lists the papers carrying its surname token, and an email button only when email is set', async ({
  page,
}) => {
  const [profiles, authors] = await Promise.all([
    e2eClient.fetch<{ slug: string; name: string | null; email: string | null }[]>(
      `*[_type == "profile" && hasPage == true && defined(slug.current)]{ "slug": slug.current, name, email }`
    ),
    e2eClient.fetch<(string | null)[]>(`*[_type == "publication"].author`),
  ])
  test.skip(profiles.length === 0, 'no profile with hasPage=true exists in live data yet')

  for (const profile of profiles) {
    const expected = countPublicationsByPerson(authors, profile.name)
    const response = await page.goto(`/people/${profile.slug}`)
    expect(response?.status()).toBe(200)

    const list = page.getByTestId('person-publications')
    if (expected === 0) {
      await expect(list).toHaveCount(0)
    } else {
      await expect(
        page.getByRole('heading', { level: 2, name: `Publications (${expected})`, exact: true })
      ).toBeVisible()
      await expect(list.getByTestId('pub-title')).toHaveCount(expected)
    }

    const email = profile.email?.trim()
    const button = page.getByRole('link', { name: 'Send an email', exact: true })
    if (email) {
      await expect(button).toHaveAttribute('href', `mailto:${email}`)
    } else {
      await expect(button).toHaveCount(0)
    }
  }
})
```

- [ ] **Step 3: Write the failing gallery e2e.** In `e2e/redesign-components.spec.ts`, add `'person-page'` to `GALLERY_SECTIONS`, then add:

```ts
  test('Person page gallery (a): Publications (3), the person bolded, an email button beside the address', async ({
    page,
  }) => {
    const a = page.getByTestId('gallery-person-page-a')
    await expect(a.getByRole('heading', { level: 2, name: 'Publications (3)', exact: true })).toBeVisible()
    const list = a.getByTestId('person-publications')
    await expect(list.getByTestId('pub-title')).toHaveCount(3)
    await expect(list.locator('[data-testid="pub-authors"] strong').first()).toHaveText('Natarajan P.')
    await expect(a.getByRole('link', { name: 'Send an email', exact: true })).toHaveAttribute(
      'href',
      'mailto:priya.natarajan.laboratory@sydney.edu.au'
    )
    await expect(a.getByText('priya.natarajan.laboratory@sydney.edu.au', { exact: true })).toBeVisible()
  })

  test('Person page gallery (b): no publications and no email means no section and no button', async ({ page }) => {
    const b = page.getByTestId('gallery-person-page-b')
    await expect(b.getByTestId('person-publications')).toHaveCount(0)
    await expect(b.getByRole('heading', { name: /^Publications/ })).toHaveCount(0)
    await expect(b.getByRole('link', { name: 'Send an email' })).toHaveCount(0)
  })
```

In `e2e/label-budget.spec.ts`, add `'gallery-person-page'` to `GALLERY_INSTANCES`.

- [ ] **Step 4: Run them to verify they fail.**

Run: `npx vitest run app/api/revalidate/route.test.ts` → FAIL (call counts).
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts e2e/label-budget.spec.ts --project=chromium` → FAIL (no `person-publications`, no gallery section).

- [ ] **Step 5: Implement revalidation.** In `app/api/revalidate/route.ts`:
  - In the `publication` case, after `revalidatePath(`/`)`, add the two lines below, with the comment "the people pages count and list a person's papers".
  - In the `profile` case, add `revalidatePath('/people/[slug]', 'page')` after `revalidatePath(`/people`)`.

```ts
        revalidatePath(`/people`)
        revalidatePath('/people/[slug]', 'page')
```

- [ ] **Step 6: Implement `PersonPage`.** Replace `components/redesign/screens/PersonPage.tsx` with:

```tsx
import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { Image } from 'sanity'
import type { ProfileBySlugPayload } from 'types'

import { Button } from '../Button'
import { PageTitle } from '../PageTitle'
import { initialsOf } from '../peopleModel'
import { PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import type { Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { Section } from '../Section'

// `role`, plus ` · roleDetail` when set -- both CMS strings, printed verbatim.
function metaOf(person: ProfileBySlugPayload): string | undefined {
  if (!person.role) {
    return undefined
  }
  return person.roleDetail ? `${person.role} · ${person.roleDetail}` : person.role
}

// [220px portrait | text] from `md`, stacked below it. `grid-cols-1` gives the
// stacked track a zero min-content floor, so an unbroken token in the bio (an
// inline email address) can't push the page wider than the viewport.
const PROFILE_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const PROFILE_PORTRAIT = 'max-w-[220px] md:max-w-none'

const IDENTIFIER_LINK = 'mt-5 block font-mono text-[12.5px] text-link'
// The address beside the email button is data, not a second link to the same place.
const EMAIL_ADDRESS = 'mt-3 font-mono text-[12.5px] leading-[1.5] break-all text-text-muted'

function ProfileBlock({ person }: { person: ProfileBySlugPayload }) {
  const img = person.image
    ? urlForImage(person.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const email = person.email?.trim() || null

  return (
    <div className={PROFILE_GRID}>
      <PortraitFrame
        name={person.name ?? ''}
        img={img}
        initials={initialsOf(person.name)}
        sizes="220px"
        className={PROFILE_PORTRAIT}
      />
      {/* `min-w-0`: this column holds unpredictable CMS text. */}
      <div className="min-w-0">
        <PortableBody blocks={person.fullBio} bio={person.bio} />
        {email && (
          <div className="mt-6">
            <Button href={`mailto:${email}`}>Send an email</Button>
            <p className={EMAIL_ADDRESS} data-identifier data-cms-verbatim>
              {email}
            </p>
          </div>
        )}
        {person.phone && (
          <a href={`tel:${person.phone}`} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
            {person.phone}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * `/people/[slug]`. `page.tsx` owns the fetch, metadata, JSON-LD and
 * `notFound`; `publications` arrive already filtered to this person
 * (`publicationsByPerson`) and bolding their surname.
 */
export function PersonPage({
  person,
  publications,
  headingLevel,
}: {
  person: ProfileBySlugPayload
  publications: Publication[]
  /** `'h2'` only in the /preview/components gallery, which has its own `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  return (
    <div>
      <PageTitle title={person.name ?? ''} meta={metaOf(person)} headingLevel={headingLevel} />
      {/* The profile block has no heading of its own, so the label is its heading. */}
      <Section label="Profile" labelHeading borderTop={false}>
        <Link href="/people" className="text-[13px] leading-none font-medium text-link">
          ← All people
        </Link>
        <div className="mt-[26px]">
          <ProfileBlock person={person} />
        </div>
      </Section>
      {publications.length > 0 && (
        <Section label={`Publications (${publications.length})`} labelHeading>
          <div data-testid="person-publications">
            {publications.map((pub) => (
              <PublicationRow key={pub.id} pub={pub} href={pub.href} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Wire the route.** In `app/people/[slug]/page.tsx`:
  - add `publicationsQuery` to the `lib/sanity.queries` import;
  - import `publicationsByPerson` from `components/redesign/publicationModel`;
  - add `PublicationPayload` to the `types` import;
  - add a fourth fetch in `getData`, and return `publications`:

```ts
      sanityFetch({ query: publicationsQuery, stega: false }),
```

```ts
    publications: (publicationsData as PublicationPayload[] | null) ?? [],
```

Destructure it in the default export and render:

```tsx
      <PersonPage person={profile} publications={publicationsByPerson(publications, profile.name)} />
```

- [ ] **Step 8: Add the gallery fixtures.** In `components/redesign/fixtures.ts`:
  - add `ProfileBySlugPayload` to the `types` import;
  - give `make` a trailing parameter `surname: string = 'Holsinger'`, and pass it to `splitAuthors(authors, surname)`;
  - after `PEOPLE_SETTINGS_WITHOUT_LAB_HEAD`, add:

```ts
// A profile page with everything set: portrait, email, phone, a two-paragraph
// bio and three papers -- one without a slug, so its title renders unlinked.
export const PERSON_PAGE_FIXTURE: ProfileBySlugPayload = {
  _id: 'fixture-person-page',
  image: PEOPLE_IMAGE as unknown as ProfileBySlugPayload['image'],
  name: 'Dr Priya Natarajan',
  role: 'Research Scientist',
  roleDetail: null,
  email: 'priya.natarajan.laboratory@sydney.edu.au',
  phone: '+61 2 9351 0000',
  bio: null,
  slug: 'priya-natarajan',
  hasPage: true,
  fullBio: [
    portableParagraph(
      'person-p1',
      'Dr Natarajan studies how glial cells support neuronal circuits under chronic metabolic stress.'
    ),
    portableParagraph('person-p2', 'She joined the laboratory in 2021 after postdoctoral work in Melbourne.'),
  ] as ProfileBySlugPayload['fullBio'],
}

// No portrait, no email, no phone, no papers: the page must render the bio
// alone, with no Publications section and no email button.
export const PERSON_PAGE_BARE_FIXTURE: ProfileBySlugPayload = {
  _id: 'fixture-person-page-bare',
  image: null,
  name: 'Sam Okafor',
  role: 'Lab Manager',
  roleDetail: null,
  email: null,
  phone: null,
  bio: 'Keeps the laboratory running.',
  slug: 'sam-okafor',
  hasPage: true,
  fullBio: null,
}

export const PERSON_PAGE_PUBLICATIONS_FIXTURE: Publication[] = [
  {
    ...make(
      '2025',
      'Glial support of neuronal circuits under chronic metabolic stress',
      'Natarajan P., Okafor S., Delacroix R. and Holsinger R.M.D.',
      'Journal of Neurochemistry',
      '172(3) · 410–425',
      '10.1111/jnc.fixture-2025',
      null,
      'Article',
      ['Metabolism, oxidative stress & neuroprotection'],
      'Natarajan'
    ),
    href: '/publications/glial-support-fixture-2025',
  },
  {
    ...make(
      '2023',
      'Ageing astrocytes and synaptic repair: a review',
      'Ferreira, M., Natarajan, P.K., Holsinger, R.M.D.',
      'Molecules',
      '28(5) · 2306',
      null,
      'https://www.example.org/ageing-astrocytes-review',
      'Review',
      [],
      'Natarajan'
    ),
    href: '/publications/ageing-astrocytes-fixture-2023',
  },
  make(
    '2021',
    'Blood-based markers of early cognitive decline',
    'Okafor S. and Natarajan P.',
    'Frontiers in Neuroscience',
    '15 · 101',
    '10.3389/fnins.fixture-2021',
    null,
    'Article',
    [],
    'Natarajan'
  ),
]
```

- [ ] **Step 9: Add the gallery instances.** In `app/preview/components/Gallery.tsx`:
  - import `PersonPage` from `components/redesign/screens/PersonPage`;
  - import the three fixtures;
  - after the `gallery-people` section, add:

```tsx
      <section data-testid="gallery-person-page" className="col-start-2 px-6">
        <Heading>Person page</Heading>
        <SubHeading>(a) Portrait, email, phone, three publications (one unslugged)</SubHeading>
        <div className="mb-8 border border-rule" data-testid="gallery-person-page-a">
          <PersonPage
            person={PERSON_PAGE_FIXTURE}
            publications={PERSON_PAGE_PUBLICATIONS_FIXTURE}
            headingLevel="h2"
          />
        </div>
        <SubHeading>(b) No portrait, no email, no publications</SubHeading>
        <div className="border border-rule" data-testid="gallery-person-page-b">
          <PersonPage person={PERSON_PAGE_BARE_FIXTURE} publications={[]} headingLevel="h2" />
        </div>
      </section>
```

- [ ] **Step 10: Run the tests to verify they pass.**

Run: `npx vitest run app/api/revalidate/route.test.ts` → PASS.
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts e2e/label-budget.spec.ts e2e/mobile.spec.ts` → PASS on all three projects. `mobile.spec.ts` already checks the PI profile for overflow at device width, and fixture-level axe covers the new gallery section.

- [ ] **Step 11: Prove the new CSS, and run the gates.** `npm run css:proof -- --grep '.mt-3'` (the only utility not already in the build; skip it if the grep shows it already exists). Then run `npm run type-check`, `npm run lint`, `npx vitest run`, `npm run build`, and the full `npx playwright test -c playwright.alt.config.ts`. All pass. Restore `next-env.d.ts` and delete `playwright.alt.config.ts`.

- [ ] **Step 12: Commit.**

```bash
git add components/redesign/screens/PersonPage.tsx "app/people/[slug]/page.tsx" app/api/revalidate/route.ts app/api/revalidate/route.test.ts components/redesign/fixtures.ts app/preview/components/Gallery.tsx e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts e2e/label-budget.spec.ts
git commit -m "feat(people): list a person's publications and add an email button on the profile page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: People — one continuous grid, quiet initials tile, alumni list, spotlight rule

**Files:**
- Modify: `components/redesign/peopleModel.ts`, `components/redesign/peopleModel.test.ts`
- Modify: `components/redesign/PersonCard.tsx`, `components/redesign/tokens.ts` (the `STRIPE_BG` doc comment only)
- Modify: `components/redesign/screens/People.tsx`
- Modify: `lib/sanity.queries.ts`, `sanity.types.ts` (via `npm run typegen`), `app/people/page.tsx`
- Modify: `app/preview/components/Gallery.tsx`
- Test: `e2e/people.spec.ts`, `e2e/lab-head-spotlight.spec.ts`, `e2e/redesign-components.spec.ts`

**Interfaces:**
- Consumes (Task 1): `countPublicationsByPerson`.
- Produces:

```ts
// components/redesign/peopleModel.ts
export interface MemberCard<T> { profile: T; group: string | null }
export function flattenMembers<T>(sections: RoleGroupSection<T>[]): MemberCard<T>[]
export function roleLine(role: string | null | undefined, group: string | null): string | null
export function profileSaysMore(p: { publicationCount: number; bio?: string | null; fullBio?: unknown }): boolean

// components/redesign/PersonCard.tsx -- PersonCardProps gains/changes:
//   group?: string | null   (rendered as data-testid="person-card-group")
//   role?: string | null    (omitted when empty)
// PortraitFrame's no-image branch carries data-testid="portrait-initials".

// components/redesign/screens/People.tsx
//   new prop: labHeadPublicationCount?: number  (default 0)
//   DOM: one data-testid="people-members" grid; each card wrapper has
//   data-testid="person-card" data-name data-group; alumni are
//   <ul data-testid="people-alumni"><li data-testid="alumni-name" data-name>.

// lib/sanity.queries.ts
export const publicationAuthorsQuery // *[_type == "publication"].author -> (string | null)[]
```

- [ ] **Step 1: Write the failing unit tests.** In `components/redesign/peopleModel.test.ts`, add `flattenMembers`, `profileSaysMore` and `roleLine` to the imports, and append:

```ts
const block = (key: string, text: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}-s`, text, marks: [] }],
})

describe('flattenMembers', () => {
  it('runs every section into one list, in order, each card carrying its section title', () => {
    const cards = flattenMembers([
      { id: 'a', title: 'PhD Candidate', profiles: ['p1', 'p2'] },
      { id: 'b', title: 'Honours Student', profiles: ['p3'] },
      { id: 'other', title: null, profiles: ['p4'] },
    ])
    expect(cards).toEqual([
      { profile: 'p1', group: 'PhD Candidate' },
      { profile: 'p2', group: 'PhD Candidate' },
      { profile: 'p3', group: 'Honours Student' },
      { profile: 'p4', group: null },
    ])
  })

  it('is empty for no sections', () => {
    expect(flattenMembers([])).toEqual([])
  })
})

describe('roleLine', () => {
  it.each([
    ['Research Scientist', 'Research Scientist', null],
    ['research scientist ', 'Research Scientist', null],
    ['Visiting Intern — Germany', 'International Interns', 'Visiting Intern — Germany'],
    ['Lab Manager', null, 'Lab Manager'],
    [null, 'PhD Candidate', null],
    ['   ', null, null],
  ])('role %j in group %j -> %j', (role, group, expected) => {
    expect(roleLine(role, group)).toBe(expected)
  })
})

describe('profileSaysMore', () => {
  const full = [block('f1', 'Short bio.'), block('f2', 'And a second paragraph.')]

  it('is true whenever there are publications', () => {
    expect(profileSaysMore({ publicationCount: 2, bio: null, fullBio: null })).toBe(true)
  })

  it('is true when both texts are set and differ', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: full })).toBe(true)
  })

  it('is false when bio is unset, because the spotlight then shows fullBio itself', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: null, fullBio: full })).toBe(false)
    expect(profileSaysMore({ publicationCount: 0, bio: '   ', fullBio: full })).toBe(false)
  })

  it('is false when the two texts differ only in whitespace', () => {
    expect(
      profileSaysMore({ publicationCount: 0, bio: 'Short   bio.\n', fullBio: [block('f1', ' Short bio. ')] })
    ).toBe(false)
  })

  it('is false when fullBio is unset or empty', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: null })).toBe(false)
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: [] })).toBe(false)
  })
})
```

- [ ] **Step 2: Write the failing e2e.** In `e2e/people.spec.ts`:
  - **Replace** the test `'member section headings appear in roleGroup orderRank order, alumni excluded'` with the first test below.
  - **Add** the other two tests, and add the imports `import { profileSaysMore } from 'components/redesign/peopleModel'` and `import { countPublicationsByPerson } from 'components/redesign/publicationModel'`.

```ts
  test('current members run in one grid, in roleGroup order, each card labelled with its group', async ({
    page,
  }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const { gridProfiles } = deriveGridProfiles(profiles, settings)
    const { members } = computeSections(gridProfiles, roleGroups)
    const expected = members.flatMap((s) =>
      s.profiles.map((p) => ({ name: p.name ?? '', group: s.title ?? '' }))
    )
    test.skip(expected.length === 0, 'no current members in this dataset')

    await page.goto('/people')
    await expect(page.getByTestId('people-members')).toHaveCount(1)
    const rendered = await page
      .getByTestId('people-members')
      .getByTestId('person-card')
      .evaluateAll((els) =>
        els.map((el) => ({
          name: el.getAttribute('data-name') ?? '',
          group: el.getAttribute('data-group') ?? '',
          label: el.querySelector('[data-testid="person-card-group"]')?.textContent ?? '',
        }))
      )
    expect(rendered.map(({ name, group }) => ({ name, group }))).toEqual(expected)
    // The visible label is the group title itself, or absent for the ungrouped.
    for (const card of rendered) {
      expect(card.label).toBe(card.group)
    }
    // No per-group headings any more.
    await expect(page.getByTestId('people-section-title')).toHaveCount(0)
  })

  test('no missing portrait renders a label or a stripe', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByText(/no portrait/i)).toHaveCount(0)
    const styles = await page.getByTestId('portrait-initials').evaluateAll((els) =>
      els.map((el) => {
        const c = getComputedStyle(el)
        return { bg: c.backgroundImage, border: c.borderTopWidth }
      })
    )
    for (const s of styles) {
      expect(s).toEqual({ bg: 'none', border: '0px' })
    }
  })

  test('the spotlight links to the profile only when the profile says more', async ({ page }) => {
    const [live, authors] = await Promise.all([
      e2eClient.fetch<{
        showLabHeadOnPeople: boolean | null
        labHead: {
          name: string | null
          bio: string | null
          fullBio: unknown
          hasPage: boolean | null
          slug: string | null
        } | null
      } | null>(
        `*[_type == "settings"][0]{ showLabHeadOnPeople, labHead->{ name, bio, fullBio, hasPage, "slug": slug.current } }`
      ),
      e2eClient.fetch<(string | null)[]>(`*[_type == "publication"].author`),
    ])
    const labHead = live?.labHead ?? null
    test.skip(!labHead || live?.showLabHeadOnPeople === false, 'no lab-head spotlight in this dataset')

    const expectLink =
      Boolean(labHead!.hasPage && labHead!.slug) &&
      profileSaysMore({
        publicationCount: countPublicationsByPerson(authors, labHead!.name),
        bio: labHead!.bio,
        fullBio: labHead!.fullBio,
      })

    const response = await page.goto('/people')
    test.skip(response?.status() === 404, '/people is switched off in this dataset')
    const link = page.getByTestId('people-spotlight').getByRole('link', { name: 'Profile and publications →' })
    await expect(link).toHaveCount(expectLink ? 1 : 0)
    if (expectLink) {
      await expect(link).toHaveAttribute('href', `/people/${labHead!.slug}`)
    }
    await expect(page.getByText('Full profile →')).toHaveCount(0)
  })
```

In `e2e/lab-head-spotlight.spec.ts`, change `page.getByText('Full profile →')` to `page.getByText('Profile and publications →')`.

In `e2e/redesign-components.spec.ts`:
- Rename the (a) spotlight test to `'People gallery (a): spotlight shows the quiet initials tile, name, both bio paragraphs, no email, and a Profile and publications link'`. Replace its `Full profile →` assertion with `await expect(instance.getByRole('link', { name: 'Profile and publications →' })).toHaveAttribute('href', '/people/ilse-van-der-berg')`. Add `await expect(spotlight.getByText('Head of laboratory', { exact: false })).toHaveCount(0)`.
- Rename the alumni test to `'People gallery (a): the alumni list has all 22 names, in order'`, keeping its assertions.
- Replace `'the number of section-title headings equals the meta\'s group count'` with the first test below, and add the rest:

```ts
  test("People gallery (a): the distinct group labels on the cards equal the meta's group count", async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    const meta = await instance.getByTestId('page-title-meta').innerText()
    const expectedGroups = Number(meta.match(/(\d+)\s+groups?/i)![1])
    const labels = await instance.getByTestId('person-card-group').allTextContents()
    expect(new Set(labels).size).toBe(expectedGroups)
    await expect(instance.getByTestId('people-section-title')).toHaveCount(0)
  })

  test('People gallery (a): a role equal to its group title is not repeated; a different role is', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    const priya = instance.locator('[data-testid="person-card"][data-name="Dr Priya Natarajan"]')
    await expect(priya.getByText('Research Scientist', { exact: true })).toHaveCount(1)
    const intern = instance.locator('[data-testid="person-card"][data-name="Intern 1 Surname1"]')
    await expect(intern.getByTestId('person-card-group')).toHaveText('International Interns')
    await expect(intern.getByText('Visiting Intern — Germany')).toBeVisible()
    const ungrouped = instance.locator('[data-testid="person-card"][data-name="Sam Okafor"]')
    await expect(ungrouped.getByTestId('person-card-group')).toHaveCount(0)
    await expect(ungrouped.getByText('Lab Manager')).toBeVisible()
  })

  test('People gallery (a): alumni are 1 column on phones, 3 from md, 4 from lg', async ({ page }) => {
    for (const [width, columns] of [
      [375, 1],
      [800, 3],
      [1280, 4],
    ] as const) {
      await page.setViewportSize({ width, height: 900 })
      const list = page.getByTestId('gallery-people-a').getByTestId('people-alumni')
      const count = await list.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      expect(count, `${width}px`).toBe(columns)
    }
  })

  test('People gallery (c): no publications and no short bio means no profile link', async ({ page }) => {
    const instance = page.getByTestId('gallery-people-c')
    await expect(instance.getByTestId('people-spotlight')).toBeVisible()
    await expect(instance.getByRole('link', { name: 'Profile and publications →' })).toHaveCount(0)
  })

  test('PersonCard: a missing portrait is a quiet initials tile -- no stripe, no border, Archivo initials', async ({
    page,
  }) => {
    const section = page.getByTestId('gallery-person-card')
    const tile = section.getByTestId('portrait-initials').first()
    const s = await tile.evaluate((el) => {
      const c = getComputedStyle(el)
      const initials = el.querySelector('span')!
      return { bg: c.backgroundImage, border: c.borderTopWidth, font: getComputedStyle(initials).fontFamily }
    })
    expect(s.bg).toBe('none')
    expect(s.border).toBe('0px')
    expect(s.font).toMatch(/Archivo/i)
    await expect(section.getByText(/portrait on file/i)).toHaveCount(0)
  })
```

- [ ] **Step 3: Run them to verify they fail.**

Run: `npx vitest run components/redesign/peopleModel.test.ts` → FAIL (not exported).
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/people.spec.ts e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts --project=chromium` → FAIL.

- [ ] **Step 4: Implement the model helpers.** Append to `components/redesign/peopleModel.ts`, and add `import { toPlainText } from '@portabletext/react'` at the top. `homeModel.ts` already imports it the same way, and the e2e process can load it.

```ts
export interface MemberCard<T> {
  profile: T
  /** The role group's title, verbatim; `null` for the ungrouped catch-all. */
  group: string | null
}

/**
 * Current-member sections run into one list for a single continuous grid, in
 * section order (role groups by `orderRank`, then the ungrouped catch-all),
 * each card carrying its own group label.
 */
export function flattenMembers<T>(sections: RoleGroupSection<T>[]): MemberCard<T>[] {
  return sections.flatMap((section) => section.profiles.map((profile) => ({ profile, group: section.title })))
}

/**
 * The card's role line: `role` verbatim, or `null` when it is blank or just
 * repeats the group label above it (compared trimmed and case-insensitively).
 */
export function roleLine(role: string | null | undefined, group: string | null): string | null {
  const trimmed = role?.trim()
  if (!trimmed) {
    return null
  }
  if (group && trimmed.toLowerCase() === group.trim().toLowerCase()) {
    return null
  }
  return role ?? null
}

function normalisedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Whether the profile page says more than the People spotlight: it lists
 * publications, or it shows a `fullBio` that differs from the short `bio` the
 * spotlight shows. With `bio` blank the spotlight falls back to `fullBio`
 * itself, so there is nothing more to see.
 */
export function profileSaysMore({
  publicationCount,
  bio,
  fullBio,
}: {
  publicationCount: number
  bio?: string | null
  fullBio?: unknown
}): boolean {
  if (publicationCount > 0) {
    return true
  }
  const shortText = normalisedText(bio ?? '')
  const fullText =
    Array.isArray(fullBio) && fullBio.length > 0
      ? normalisedText(toPlainText(fullBio as Parameters<typeof toPlainText>[0]))
      : ''
  return shortText !== '' && fullText !== '' && fullText !== shortText
}
```

- [ ] **Step 5: Implement `PersonCard`.** In `components/redesign/PersonCard.tsx`:
  - `PersonCardProps`: `role?: string | null` (was `role: string`), plus `group?: string | null`.
  - Remove the `STRIPE_BG` import and the `FOOTPRINT_FALLBACK` border.
  - Replace the fallback branch of `PortraitFrame`.
  - Render the group and role lines conditionally.

```tsx
const FOOTPRINT_FALLBACK = 'relative aspect-[4/5] w-full flex items-center justify-center bg-surface-raised'
```

```tsx
  ) : (
    // A quiet tile: raised surface, initials in muted Archivo, nothing else.
    // Named for the person when a name is given (the image branch's `alt`);
    // hidden from assistive tech when the name is already read nearby.
    <div
      data-testid="portrait-initials"
      className={`${FOOTPRINT_FALLBACK} ${className ?? ''}`}
      role={name ? 'img' : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
    >
      <span aria-hidden="true" className="font-sans text-[1.75rem] leading-none font-medium text-text-muted">
        {initials}
      </span>
    </div>
  )
```

In `PersonCard`, destructure `group`. Replace the unconditional role `<div>` with:

```tsx
      {/* The group label: the role group's CMS title, verbatim. */}
      {group && (
        <div
          data-testid="person-card-group"
          data-cms-verbatim
          className="mt-1 font-sans text-[12px] leading-[1.4] font-medium break-words text-text-muted"
        >
          {group}
        </div>
      )}
      {role && (
        <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] break-words text-text-faint" data-cms-verbatim>
          {role}
        </div>
      )}
```

Keep the `detail` block unchanged. Update the file's comments so they describe the tile as it now is. In `components/redesign/tokens.ts`, update the `STRIPE_BG` doc comment to name its current consumers only: `ResourceBlock.tsx`'s figure placeholder and `Home.tsx`'s `PiPortrait64` fallback.

- [ ] **Step 6: Add the authors query.** In `lib/sanity.queries.ts`, after `publicationCountQuery`:

```ts
// Just the author strings, so /people can count the lab head's papers without
// fetching every publication field.
export const publicationAuthorsQuery = groq`
  *[_type == "publication"].author
`
```

Run: `npm run typegen`. Expected: `sanity.types.ts` gains `PublicationAuthorsQueryResult = Array<string | null>` and its registry entry, with no other diff.

- [ ] **Step 7: Implement `People`.** Replace `components/redesign/screens/People.tsx` with:

```tsx
import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Image } from 'sanity'
import type { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { PageTitle } from '../PageTitle'
import {
  excludeLabHead,
  flattenMembers,
  formatPeopleMeta,
  groupByRoleGroup,
  initialsOf,
  type MemberCard,
  memberCount,
  profileSaysMore,
  roleLine,
  shouldShowLabHeadSpotlight,
  splitAlumni,
} from '../peopleModel'
import { PersonCard, PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import { Section } from '../Section'

// [220px portrait | text] from `md`; stacked below it, with the portrait capped
// at 220px so it doesn't run full-bleed on a phone. `grid-cols-1` gives the
// stacked track a zero min-content floor, so an unbroken token in the bio (an
// inline email address) can't widen the page.
const SPOTLIGHT_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const SPOTLIGHT_PORTRAIT = 'max-w-[220px] md:max-w-none'
const PROFILE_LINK = 'mt-5 inline-block text-[14px] font-medium text-link'
const EMAIL_LINK = 'mt-5 block font-mono text-[12.5px] text-link'

// One continuous grid: 2 columns on phones, 3 from `md`, 6 from `lg`. Each card
// carries its own group label, so groups flow on with no half-empty rows.
const CARD_GRID = 'grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-3 lg:grid-cols-6'

// A name list: 1 column on phones, 3 from `md`, 4 from `lg`.
const ALUMNI_GRID = 'grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-3 lg:grid-cols-4'
const ALUMNI_NAME = 'text-body break-words'
// An underline, not colour alone, marks a linked name among plain ones (axe's
// link-in-text-block rule).
const ALUMNI_LINK = 'text-link underline'

type LabHead = NonNullable<SettingsPayload['labHead']>

function SpotlightBlock({ labHead, publicationCount }: { labHead: LabHead; publicationCount: number }) {
  const img = labHead.image
    ? urlForImage(labHead.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const hasPage = Boolean(labHead.hasPage && labHead.slug)
  const showProfileLink =
    hasPage && profileSaysMore({ publicationCount, bio: labHead.bio, fullBio: labHead.fullBio })
  // The short `bio` when there is one; the profile page carries `fullBio`.
  const shortBio = labHead.bio?.trim() ? labHead.bio : null

  return (
    <div data-testid="people-spotlight" data-name={labHead.name ?? ''} className={SPOTLIGHT_GRID}>
      <PortraitFrame
        name={labHead.name ?? ''}
        img={img}
        initials={initialsOf(labHead.name)}
        sizes="220px"
        className={SPOTLIGHT_PORTRAIT}
      />
      {/* `min-w-0`: this column holds unpredictable CMS text. */}
      <div className="min-w-0">
        <h2 className="text-heading break-words">{labHead.name}</h2>
        {shortBio ? <PortableBody bio={shortBio} /> : <PortableBody blocks={labHead.fullBio} />}
        {labHead.email && (
          <a href={`mailto:${labHead.email}`} data-identifier data-cms-verbatim className={EMAIL_LINK}>
            {labHead.email}
          </a>
        )}
        {showProfileLink && (
          <Link href={`/people/${labHead.slug}`} className={PROFILE_LINK}>
            Profile and publications →
          </Link>
        )}
      </div>
    </div>
  )
}

function cardHref(profile: ProfilePayload): string | null {
  return profile.hasPage && profile.slug ? `/people/${profile.slug}` : null
}

function cardImg(profile: ProfilePayload): string | undefined {
  return profile.image
    ? urlForImage(profile.image as Image)?.width(400).height(500).fit('crop').url()
    : undefined
}

function MembersBlock({ cards }: { cards: MemberCard<ProfilePayload>[] }) {
  return (
    <div data-testid="people-members" className={CARD_GRID}>
      {cards.map(({ profile, group }) => (
        <div
          key={profile._id}
          data-testid="person-card"
          data-name={profile.name ?? ''}
          data-group={group ?? ''}
        >
          <PersonCard
            name={profile.name ?? ''}
            group={group}
            role={roleLine(profile.role, group)}
            detail={profile.roleDetail}
            img={cardImg(profile)}
            initials={initialsOf(profile.name)}
            href={cardHref(profile)}
          />
        </div>
      ))}
    </div>
  )
}

function AlumniBlock({ alumni }: { alumni: ProfilePayload[] }) {
  return (
    <ul data-testid="people-alumni" className={ALUMNI_GRID}>
      {alumni.map((profile) => {
        const href = cardHref(profile)
        const name = profile.name ?? ''
        return (
          <li key={profile._id} data-testid="alumni-name" data-name={name} className={ALUMNI_NAME}>
            {href ? (
              <Link href={href} className={ALUMNI_LINK}>
                {name}
              </Link>
            ) : (
              name
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function People({
  settings,
  profiles,
  roleGroups,
  labHeadPublicationCount = 0,
  headingLevel,
}: {
  settings: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
  /** The lab head's paper count (`countPublicationsByPerson`), for the spotlight's profile-link rule. */
  labHeadPublicationCount?: number
  /** `'h2'` only in the /preview/components gallery, which has its own `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  const showSpotlight = shouldShowLabHeadSpotlight(settings)
  const labHead = settings.labHead
  // The lab head leaves the grid only when the spotlight shows them, so nobody
  // disappears from the page.
  const gridProfiles = showSpotlight && labHead ? excludeLabHead(profiles, labHead._id) : profiles
  const { members, alumni } = splitAlumni(groupByRoleGroup(gridProfiles, roleGroups))
  const cards = flattenMembers(members)

  // The ungrouped catch-all is untitled and never counts as a group.
  const meta = formatPeopleMeta({
    showSpotlight,
    n: memberCount(members),
    g: members.filter((section) => section.title).length,
  })

  // The spotlight has its own heading (the lab head's name). Members and Alumni
  // have none, so their labels are the sections' headings.
  const blocks: Array<{ label: string; labelHeading: boolean; content: ReactNode }> = []
  if (showSpotlight && labHead) {
    blocks.push({
      label: 'Lab head',
      labelHeading: false,
      content: <SpotlightBlock labHead={labHead} publicationCount={labHeadPublicationCount} />,
    })
  }
  if (cards.length > 0) {
    blocks.push({ label: 'Members', labelHeading: true, content: <MembersBlock cards={cards} /> })
  }
  if (alumni.length > 0) {
    blocks.push({ label: 'Alumni', labelHeading: true, content: <AlumniBlock alumni={alumni} /> })
  }

  return (
    <div>
      <PageTitle title="People" meta={meta} headingLevel={headingLevel} />
      {blocks.map((block, index) => (
        <Section key={block.label} label={block.label} labelHeading={block.labelHeading} borderTop={index !== 0}>
          {block.content}
        </Section>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Wire the route.** In `app/people/page.tsx`:
  - add `publicationAuthorsQuery` to the queries import;
  - import `countPublicationsByPerson` from `components/redesign/publicationModel`;
  - add `sanityFetch({ query: publicationAuthorsQuery, stega: false })` as a fifth fetch;
  - return `authors: (authorsData as (string | null)[] | null) ?? []`;
  - render:

```tsx
      <People
        settings={settings}
        profiles={profiles}
        roleGroups={roleGroups}
        labHeadPublicationCount={countPublicationsByPerson(authors, settings.labHead?.name)}
      />
```

- [ ] **Step 9: Update the gallery.** In `app/preview/components/Gallery.tsx`'s `gallery-people` section:
  - pass `labHeadPublicationCount={3}` to instance (a), and change its `SubHeading` to "(a) Lab head set, no portrait, no short bio, hasPage, 3 publications";
  - after instance (b), add:

```tsx
        <SubHeading>(c) Lab head set, no short bio and no publications -- no profile link</SubHeading>
        <div className="mt-8 border border-rule" data-testid="gallery-people-c">
          <People
            settings={PEOPLE_SETTINGS_WITH_LAB_HEAD}
            profiles={PEOPLE_PROFILES_FIXTURE}
            roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
            labHeadPublicationCount={0}
            headingLevel="h2"
          />
        </div>
```

The gallery `PersonCard` section passes `role` as a string already, so it's unaffected. In `components/redesign/fixtures.ts`, update the `PEOPLE_LAB_HEAD_FIXTURE` comment so it describes what the fixture proves now: the quiet initials tile, and that with no short bio the spotlight shows `fullBio`.

- [ ] **Step 10: Run the tests to verify they pass.**

Run: `npx vitest run components/redesign/peopleModel.test.ts components/redesign/PersonCard.test.ts` → PASS.
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/people.spec.ts e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts e2e/label-budget.spec.ts e2e/section-label.spec.ts e2e/image-geometry.spec.ts e2e/home.spec.ts` → PASS on all three projects.

- [ ] **Step 11: Prove the new CSS, and run the gates.**

```bash
npm run css:proof -- --grep '.lg\:grid-cols-4'
npm run css:proof -- --grep '.text-\[1\.75rem\]'
npm run css:proof -- --grep '.gap-y-2\.5'
npm run css:proof -- --grep '.text-\[12px\]'
```

Each exits 0. Then run the full gates and full e2e. Restore `next-env.d.ts` and delete `playwright.alt.config.ts`.

- [ ] **Step 12: Commit.**

```bash
git add components/redesign/peopleModel.ts components/redesign/peopleModel.test.ts components/redesign/PersonCard.tsx components/redesign/tokens.ts components/redesign/screens/People.tsx lib/sanity.queries.ts sanity.types.ts app/people/page.tsx app/preview/components/Gallery.tsx components/redesign/fixtures.ts e2e/people.spec.ts e2e/lab-head-spotlight.spec.ts e2e/redesign-components.spec.ts
git commit -m "feat(people): one continuous grid with group labels, quiet initials tile, alumni name list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Research — no tag labels, and a meta line that counts only projects with text

> **Before starting:** confirm ruling 1 (no per-project label) with the command centre. If it rules for the spec's letter instead:
> - Step 4 passes `label={project.title}` and `labelHeading`, and deletes the `<h2 data-testid="research-project-title">` from `Narrative`;
> - Step 1's label assertion expects the project titles followed by `'Enquiries'`;
> - `research.spec.ts`'s title reads switch to the section labels.

**Files:**
- Modify: `components/redesign/researchModel.ts`, `components/redesign/researchModel.test.ts`
- Modify: `components/redesign/screens/Research.tsx`
- Modify: `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`
- Test: `e2e/research.spec.ts`, `e2e/redesign-components.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:

```ts
// components/redesign/researchModel.ts
// ResearchProjectView loses `label`.
export function hasBodyText(body: ResearchProjectView['body']): boolean
export function countProjectsWithBody(projects: Pick<ResearchProjectView, 'body'>[]): number

// components/redesign/fixtures.ts
export const RESEARCH_EMPTY_BODIES_FIXTURE: ResearchProjectView[]
```

- [ ] **Step 1: Write the failing tests.** In `components/redesign/researchModel.test.ts`:
  - add `countProjectsWithBody` and `hasBodyText` to the import;
  - delete `expect(view.label).toBe('Astrocytes')` from the first `toResearchView` test, and remove "label/" from its title;
  - rename `'label falls back to "Project" and tagLine is "" when there are no tags'` to `'tagLine is "" when there are no tags'`, deleting its `view.label` line;
  - append:

```ts
describe('hasBodyText / countProjectsWithBody', () => {
  const para = (key: string, text: string) => ({
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}-s`, text, marks: [] }],
  })

  it('is true for a body with visible text', () => {
    expect(hasBodyText([para('a', 'Astrocytes matter.')])).toBe(true)
  })

  it.each([
    ['null', null],
    ['an empty array', []],
    ['a block with no spans', [{ _type: 'block' as const, _key: 'e', children: [] }]],
    ['a whitespace-only span', [para('w', '   \n  ')]],
  ])('is false for %s', (_label, body) => {
    expect(hasBodyText(body as Parameters<typeof hasBodyText>[0])).toBe(false)
  })

  it('counts only projects whose body has text', () => {
    expect(
      countProjectsWithBody([{ body: [para('a', 'Text.')] }, { body: null }, { body: [para('w', '  ')] }])
    ).toBe(1)
  })
})
```

In `e2e/research.spec.ts`:
- add the imports `import { countProjectsWithBody, toResearchView } from 'components/redesign/researchModel'`, `import { researchProjectsQuery } from 'lib/sanity.queries'` and `import type { ResearchProjectPayload } from 'types'`;
- **replace** the test `"the meta's count matches what's rendered"` with the first test below, and add the rest:

```ts
  test('the meta counts only projects whose resolved body has text', async ({ page }) => {
    const payloads = await e2eClient.fetch<ResearchProjectPayload[]>(researchProjectsQuery)
    const n = countProjectsWithBody(payloads.map(toResearchView))

    await page.goto('/research')
    const meta = await page.getByTestId('page-title-meta').innerText()
    expect(meta).toBe(`${n} active project${n === 1 ? '' : 's'}`)
  })

  test('project sections carry no label; only Enquiries is labelled', async ({ page }) => {
    await page.goto('/research')
    await expect(page.getByTestId('section-label')).toHaveText(['Enquiries'])
  })
```

In `e2e/redesign-components.spec.ts`, add `'research-empty-bodies'` to `GALLERY_SECTIONS`, and add:

```ts
  test('Research gallery: a project with a missing or blank body renders but is not counted', async ({ page }) => {
    const section = page.getByTestId('gallery-research-empty-bodies')
    await expect(section.getByTestId('page-title-meta')).toHaveText('1 active project')
    await expect(section.getByTestId('research-project-title')).toHaveCount(3)
  })

  test('Research gallery: project sections carry no tag label', async ({ page }) => {
    await expect(page.getByTestId('gallery-research').getByTestId('section-label')).toHaveText(['Enquiries'])
  })
```

- [ ] **Step 2: Run them to verify they fail.**

Run: `npx vitest run components/redesign/researchModel.test.ts` → FAIL (not exported).
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/research.spec.ts e2e/redesign-components.spec.ts --project=chromium` → FAIL (tag labels present, gallery section missing).

- [ ] **Step 3: Implement the model.** In `components/redesign/researchModel.ts`:
  - add `import { toPlainText } from '@portabletext/react'`;
  - delete the `label` field and its doc comment from `ResearchProjectView`;
  - delete `label: tags[0] || 'Project',` from `toResearchView`;
  - append:

```ts
/**
 * Whether a resolved body has any visible text. A block array can be present
 * yet blank (an editor cleared the text, leaving empty or whitespace-only
 * spans), and such a project isn't counted as active.
 */
export function hasBodyText(body: ResearchProjectView['body']): boolean {
  if (!body || body.length === 0) return false
  return toPlainText(body as Parameters<typeof toPlainText>[0]).trim() !== ''
}

/** The Research meta's count: projects whose resolved body has text. */
export function countProjectsWithBody(projects: Pick<ResearchProjectView, 'body'>[]): number {
  return projects.filter((project) => hasBodyText(project.body)).length
}
```

- [ ] **Step 4: Implement the screen.** In `components/redesign/screens/Research.tsx`:
  - import `countProjectsWithBody` from `../researchModel` (alongside the `ResearchProjectView` type);
  - set `const n = countProjectsWithBody(projects)`;
  - make the empty-state branch test `projects.length === 0` rather than `n === 0`;
  - remove `label={project.label}` from the project `Section`, and replace the comment above that map with the one below:

```tsx
        // No label: the project's own `<h2>` (in `Narrative`) is the section's
        // name, and a label repeating it would print the title twice.
```

Update the file's header comment so it no longer mentions tag labels.

- [ ] **Step 5: Update the fixtures and gallery.** In `components/redesign/fixtures.ts`, delete `label: tags[0] || 'Project',` from `researchProjectView`. Then append:

```ts
// Three projects, one with text, one with no body, one whose only paragraph is
// whitespace: all three render, and the meta counts one.
export const RESEARCH_EMPTY_BODIES_FIXTURE: ResearchProjectView[] = [
  researchProjectView({
    id: 'fixture-research-with-body',
    title: 'Neurotrophic signalling in the ageing hippocampus',
    body: [overviewParagraph('research-with-body-p1', 'Measuring how neurotrophic signalling changes with age.')],
    start: '2022-01-01T00:00:00.000Z',
    tags: ['Neurotrophins'],
    category: null,
    cover: null,
  }),
  researchProjectView({
    id: 'fixture-research-no-body',
    title: 'A project with no overview yet',
    body: [],
    start: null,
    tags: [],
    category: null,
    cover: null,
  }),
  researchProjectView({
    id: 'fixture-research-blank-body',
    title: 'A project whose overview was cleared',
    body: [overviewParagraph('research-blank-body-p1', '   ')],
    start: null,
    tags: [],
    category: null,
    cover: null,
  }),
]
```

In `app/preview/components/Gallery.tsx`, import `RESEARCH_EMPTY_BODIES_FIXTURE`. After the `gallery-research-contact-link` section, add:

```tsx
      <section data-testid="gallery-research-empty-bodies" className="col-start-2 px-6">
        <Heading>Research screen -- missing and blank bodies are not counted</Heading>
        <div className="border border-rule">
          <Research
            projects={RESEARCH_EMPTY_BODIES_FIXTURE}
            email="lab@example.org"
            showContactForm
            headingLevel="h2"
          />
        </div>
      </section>
```

Run `grep -rn "\.label\b\|label:" components/redesign/homeModel.ts components/redesign/screens/Home.tsx e2e/home.spec.ts e2e/research.spec.ts`. Confirm nothing reads a research view's `label`; `type-check` catches any consumer.

- [ ] **Step 6: Run the tests to verify they pass.**

Run: `npx vitest run components/redesign/researchModel.test.ts components/redesign/homeModel.test.ts` → PASS.
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/research.spec.ts e2e/redesign-components.spec.ts e2e/typography.spec.ts e2e/section-label.spec.ts e2e/label-budget.spec.ts e2e/home.spec.ts` → PASS on all three projects. The typography "heading" budget fixture still targets `research-project-title`, which stays.

- [ ] **Step 7: Run the gates.** Run the full gates and full e2e. No new utilities in this task, so no css:proof is needed. Restore `next-env.d.ts` and delete `playwright.alt.config.ts`.

- [ ] **Step 8: Commit.**

```bash
git add components/redesign/researchModel.ts components/redesign/researchModel.test.ts components/redesign/screens/Research.tsx components/redesign/fixtures.ts app/preview/components/Gallery.tsx e2e/research.spec.ts e2e/redesign-components.spec.ts
git commit -m "feat(research): drop tag labels; count only projects with text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Contact on the redesign shell; decisions doc; final verification

**Files:**
- Create: `components/redesign/contactModel.ts`, `components/redesign/contactModel.test.ts`
- Create: `components/redesign/ContactForm.tsx`, `components/redesign/screens/Contact.tsx`
- Modify: `components/redesign/FormField.tsx` (additive props)
- Modify: `lib/sanity.queries.ts` (`contact{ email, phone, address }`), `sanity.types.ts` (typegen)
- Modify: `app/contact/page.tsx`
- Delete: `components/pages/contact/Contact.tsx`, `ContactForm.tsx`, `ErrorDialog.tsx`, `SuccessScreen.tsx`, `public/success.svg`
- Modify: `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`
- Create: `e2e/contact.spec.ts`
- Modify: `e2e/label-budget.spec.ts`, `e2e/redesign-components.spec.ts`
- Modify: `docs/redesign-experiment/phase-3-decisions.md`, `docs/redesign-experiment/preview-walkthrough.md`, `docs/superpowers/specs/2026-09-23-redesign-revision-design.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:

```ts
// components/redesign/contactModel.ts
export const UNIVERSITY_URL = 'https://www.sydney.edu.au/'
export const UNIVERSITY_NAME = 'The University of Sydney'
export interface ContactDetails { email: string | null; phone: string | null; address: string | null }
export function contactDetails(contact?: { email?: string | null; phone?: string | null; address?: string | null } | null): ContactDetails
export function telHref(phone: string): string

// components/redesign/ContactForm.tsx ('use client')
export function ContactForm(props: { idPrefix?: string }): JSX.Element

// components/redesign/screens/Contact.tsx
export function Contact(props: { details: ContactDetails; headingLevel?: 'h1' | 'h2'; formIdPrefix?: string }): JSX.Element

// components/redesign/FormField.tsx -- FormFieldProps gains id?, required?, autoComplete?
```

- [ ] **Step 1: Write the failing unit tests.** Create `components/redesign/contactModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { contactDetails, telHref, UNIVERSITY_URL } from './contactModel'

describe('contactDetails', () => {
  it('trims each field and keeps inner line breaks in the address', () => {
    expect(
      contactDetails({
        email: '  lab@example.org ',
        phone: ' +61 2 9351 0876 ',
        address: '\nLaboratory of Molecular Neuroscience\nThe University of Sydney NSW 2006  ',
      })
    ).toEqual({
      email: 'lab@example.org',
      phone: '+61 2 9351 0876',
      address: 'Laboratory of Molecular Neuroscience\nThe University of Sydney NSW 2006',
    })
  })

  it('treats blank or missing fields as unset', () => {
    expect(contactDetails({ email: '   ', phone: null })).toEqual({ email: null, phone: null, address: null })
  })

  it.each([[null], [undefined]])('is all-null for %j', (contact) => {
    expect(contactDetails(contact)).toEqual({ email: null, phone: null, address: null })
  })
})

describe('telHref', () => {
  it('keeps only digits and a leading plus', () => {
    expect(telHref('+61 2 9351 0876')).toBe('tel:+61293510876')
    expect(telHref('(02) 9351-0876')).toBe('tel:0293510876')
  })
})

describe('UNIVERSITY_URL', () => {
  it('is the constant the spec names', () => {
    expect(UNIVERSITY_URL).toBe('https://www.sydney.edu.au/')
  })
})
```

- [ ] **Step 2: Write the failing e2e.** Create `e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { contactDetails, telHref, UNIVERSITY_NAME, UNIVERSITY_URL } from 'components/redesign/contactModel'

import { e2eClient } from './support/sanity'

type LiveSettings = {
  showContactForm: boolean | null
  contact: { email: string | null; phone: string | null; address: string | null } | null
}

async function fetchSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{ showContactForm, contact{ email, phone, address } }`
  )
  return settings ?? { showContactForm: null, contact: null }
}

const VISITOR = { name: 'Test Visitor', email: 'visitor@example.org', message: 'Hello from the e2e suite.' }

test.describe('/contact', () => {
  test('404s exactly when showContactForm is false', async ({ page }) => {
    const settings = await fetchSettings()
    const response = await page.goto('/contact')
    expect(response?.status()).toBe(settings.showContactForm === false ? 404 : 200)
  })

  test('shows exactly the contact details on file, plus the University link', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    const d = contactDetails(settings.contact)

    await page.goto('/contact')
    const email = page.getByTestId('contact-email')
    if (d.email) {
      await expect(email.getByRole('link')).toHaveAttribute('href', `mailto:${d.email}`)
      await expect(email.getByRole('link')).toHaveText(d.email)
    } else {
      await expect(email).toHaveCount(0)
    }
    const phone = page.getByTestId('contact-phone')
    if (d.phone) {
      await expect(phone.getByRole('link')).toHaveAttribute('href', telHref(d.phone))
      await expect(phone.getByRole('link')).toHaveText(d.phone)
    } else {
      await expect(phone).toHaveCount(0)
    }
    const address = page.getByTestId('contact-address')
    if (d.address) {
      await expect(address.locator('dd')).toHaveText(d.address)
    } else {
      await expect(address).toHaveCount(0)
    }
    const university = page.getByTestId('contact-university').getByRole('link', { name: UNIVERSITY_NAME })
    await expect(university).toHaveAttribute('href', UNIVERSITY_URL)
  })

  test('the form posts name, email, message and the honeypot to /api/formspree, then thanks the visitor', async ({
    page,
  }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    let posted: unknown = null
    await page.route('**/api/formspree', async (route) => {
      posted = route.request().postDataJSON()
      await route.fulfill({ status: 200, json: { success: true, message: {} } })
    })

    await page.goto('/contact')
    await page.getByLabel('Name', { exact: true }).fill(VISITOR.name)
    await page.getByLabel('Email', { exact: true }).fill(VISITOR.email)
    await page.getByLabel('Message', { exact: true }).fill(VISITOR.message)
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByTestId('contact-success')).toHaveText(
      'Thank you for reaching out to us! Your message has been successfully submitted.'
    )
    expect(posted).toEqual({ ...VISITOR, _gotcha: '' })
  })

  test('a failed submission opens the error dialog, keeps the typed values, and re-enables Submit on close', async ({
    page,
  }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    await page.route('**/api/formspree', (route) => route.fulfill({ status: 500, json: { success: false } }))

    await page.goto('/contact')
    await page.getByLabel('Name', { exact: true }).fill(VISITOR.name)
    await page.getByLabel('Email', { exact: true }).fill(VISITOR.email)
    await page.getByLabel('Message', { exact: true }).fill(VISITOR.message)
    await page.getByRole('button', { name: 'Submit' }).click()

    const dialog = page.getByRole('dialog', { name: 'Submission failed' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Sorry, there was an issue with submitting your message.')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(VISITOR.name)
    await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  test('details sit left of the form from lg, and above it below lg', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/contact')
      const details = (await page.getByTestId('contact-details').boundingBox())!
      const form = (await page.getByTestId('contact-form').boundingBox())!
      if (width >= 1024) {
        expect(details.x + details.width).toBeLessThanOrEqual(form.x)
        expect(Math.abs(details.y - form.y)).toBeLessThanOrEqual(4)
      } else {
        expect(details.y + details.height).toBeLessThanOrEqual(form.y)
      }
    }
  })

  test('no horizontal overflow from 320 to 1440px', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    for (const width of [320, 375, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/contact')
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
      expect(fits, `${width}px`).toBe(true)
    }
  })
})
```

In `e2e/label-budget.spec.ts`, add `'/contact'` to `ROUTES` and `'gallery-contact'` to `GALLERY_INSTANCES`. In `e2e/redesign-components.spec.ts`, add `'contact'` and `'contact-empty'` to `GALLERY_SECTIONS`, and add:

```ts
  test('Contact gallery: every detail row, the address on two lines, and the University link', async ({ page }) => {
    const section = page.getByTestId('gallery-contact')
    await expect(section.getByTestId('contact-email').getByRole('link')).toHaveAttribute(
      'href',
      'mailto:lab@example.org'
    )
    await expect(section.getByTestId('contact-phone').getByRole('link')).toHaveAttribute('href', 'tel:+61293510000')
    const address = section.getByTestId('contact-address').locator('dd')
    expect(await address.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre-line')
    expect((await address.innerText()).split('\n')).toHaveLength(2)
    await expect(section.getByRole('link', { name: 'The University of Sydney' })).toHaveAttribute(
      'href',
      'https://www.sydney.edu.au/'
    )
  })

  test('Contact gallery (no details on file): only the University row renders', async ({ page }) => {
    const details = page.getByTestId('gallery-contact-empty').getByTestId('contact-details')
    await expect(details.locator('dt')).toHaveText(['University'])
    await expect(details.locator('dd:empty')).toHaveCount(0)
  })
```

- [ ] **Step 3: Run them to verify they fail.**

Run: `npx vitest run components/redesign/contactModel.test.ts` → FAIL (module missing).
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/contact.spec.ts --project=chromium` → FAIL (no test ids on the legacy page).

- [ ] **Step 4: Implement `contactModel.ts`.**

```ts
// `settings.contact` has no URL field, so the University link is a constant.
export const UNIVERSITY_URL = 'https://www.sydney.edu.au/'
export const UNIVERSITY_NAME = 'The University of Sydney'

export interface ContactDetails {
  email: string | null
  phone: string | null
  /** Trimmed at the ends only; inner line breaks are the editor's and render as lines. */
  address: string | null
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** `settings.contact`, with blank or missing fields as `null` so each row renders only when set. */
export function contactDetails(
  contact?: { email?: string | null; phone?: string | null; address?: string | null } | null
): ContactDetails {
  return {
    email: clean(contact?.email),
    phone: clean(contact?.phone),
    address: clean(contact?.address),
  }
}

/** A dialable `tel:` href: the number's digits and a leading plus, with spaces and punctuation dropped. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
```

- [ ] **Step 5: Extend `FormField`.** In `components/redesign/FormField.tsx`, add `id?: string`, `required?: boolean` and `autoComplete?: string` to `FormFieldProps`, and destructure them (the id as `id: idProp`). Replace `const id = name || slugify(label)` with:

```ts
  const id = idProp ?? name ?? slugify(label)
  const fieldName = name ?? id
```

On both the `<textarea>` and the `<input>`, set `name={fieldName}`, `required={required}` and `autoComplete={autoComplete}`. Existing callers pass neither `id` nor `name`, or pass `name` only, so their ids and names are unchanged.

- [ ] **Step 6: Create `ContactForm.tsx`.**

```tsx
'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { type ChangeEvent, type FormEvent, useState } from 'react'

import { FormField } from './FormField'
import { PRESS } from './tokens'

interface Status {
  submitted: boolean
  submitting: boolean
  info: { error: boolean; msg: string | null }
}

interface Inputs {
  name: string
  email: string
  message: string
  _gotcha: string
}

const EMPTY_INPUTS: Inputs = { name: '', email: '', message: '', _gotcha: '' }
const SUCCESS_MESSAGE = 'Thank you for reaching out to us! Your message has been successfully submitted.'
const ERROR_MESSAGE = 'Sorry, there was an issue with submitting your message. Please try again later.'

// The primary action: inverse ink on the inverse surface, a pair guarded in styles/tokens.test.ts.
const SUBMIT = `inline-flex min-h-11 w-full items-center justify-center bg-surface-inverse px-6 font-sans text-[15px] font-medium text-text-inverse disabled:cursor-not-allowed disabled:opacity-[0.45] md:w-auto ${PRESS}`
const DIALOG_CLOSE = `mt-5 inline-flex min-h-11 items-center justify-center bg-surface-inverse px-5 font-sans text-[15px] font-medium text-text-inverse ${PRESS}`

// Off-screen rather than hidden: bots fill every field present in the DOM, and
// visitors never reach it (no tab stop, hidden from assistive tech).
const HONEYPOT_STYLE = { position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 } as const

/**
 * The contact form. It posts `{ name, email, message, _gotcha }` as JSON to
 * `/api/formspree`, which forwards it to Formspree. `idPrefix` keeps field ids
 * unique when more than one form renders on a page (the gallery); the field
 * `name`s, which key the state, never change.
 */
export function ContactForm({ idPrefix = '' }: { idPrefix?: string }) {
  const [status, setStatus] = useState<Status>({
    submitted: false,
    submitting: false,
    info: { error: false, msg: null },
  })
  const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS)

  const handleServerResponse = (ok: boolean, msg: string) => {
    if (ok) {
      setStatus((prev) => ({ ...prev, submitted: true, submitting: false, info: { error: false, msg } }))
      setInputs(EMPTY_INPUTS)
    } else {
      // `submitting` stays true until the dialog is closed.
      setStatus((prev) => ({ ...prev, info: { error: true, msg } }))
    }
  }

  const handleOnChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setInputs((prev) => ({ ...prev, [name]: value }))
    setStatus((prev) => ({ ...prev, submitting: false, info: { error: false, msg: null } }))
  }

  const handleOnSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus((prev) => ({ ...prev, submitting: true }))
    try {
      const response = await fetch('/api/formspree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      if (!response.ok) {
        throw new Error('Formspree request failed')
      }
      handleServerResponse(true, SUCCESS_MESSAGE)
    } catch {
      handleServerResponse(false, ERROR_MESSAGE)
    }
  }

  const handleDialogClose = () => {
    setStatus((prev) => ({ ...prev, submitting: false, info: { error: false, msg: null } }))
  }

  if (status.submitted && status.info.msg) {
    return (
      <p role="status" data-testid="contact-success" className="max-w-[560px] text-lead text-text">
        {status.info.msg}
      </p>
    )
  }

  return (
    <div data-testid="contact-form" className="min-w-0">
      <p className="max-w-[560px] text-body text-text-muted">
        We would love to hear from you! Whether you have a question, suggestion, or just want to say hello, feel
        free to send us a message using the form below.
      </p>
      <form onSubmit={handleOnSubmit} className="mt-6 flex max-w-[560px] flex-col gap-5">
        <input
          type="text"
          name="_gotcha"
          id={`${idPrefix}_gotcha`}
          tabIndex={-1}
          autoComplete="off"
          value={inputs._gotcha}
          onChange={handleOnChange}
          aria-hidden="true"
          style={HONEYPOT_STYLE}
        />
        <FormField
          label="Name"
          id={`${idPrefix}name`}
          name="name"
          autoComplete="name"
          required
          value={inputs.name}
          onChange={handleOnChange}
        />
        <FormField
          label="Email"
          id={`${idPrefix}email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={inputs.email}
          onChange={handleOnChange}
        />
        <FormField
          label="Message"
          id={`${idPrefix}message`}
          name="message"
          textarea
          rows={6}
          required
          value={inputs.message}
          onChange={handleOnChange}
        />
        <div>
          <button type="submit" disabled={status.submitting} className={SUBMIT}>
            {status.submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
      <Dialog open={status.info.error} onClose={handleDialogClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-scrim opacity-60" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-surface-raised p-6">
            <DialogTitle className="font-sans text-[17px] font-semibold">Submission failed</DialogTitle>
            <p className="mt-3 text-body text-text">{status.info.msg}</p>
            <button type="button" onClick={handleDialogClose} className={DIALOG_CLOSE}>
              Close
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 7: Create `screens/Contact.tsx`.**

```tsx
import type { ReactNode } from 'react'

import { ContactForm } from '../ContactForm'
import { type ContactDetails, telHref, UNIVERSITY_NAME, UNIVERSITY_URL } from '../contactModel'
import { PageTitle } from '../PageTitle'
import { Section } from '../Section'
import { MICRO_LABEL } from '../tokens'

// Details left, form right from `lg`; stacked, details first, below it.
// `grid-cols-1` gives the stacked track a zero min-content floor, so a long
// email address can't widen the page. One unprefixed `gap-12` plus one `lg:`
// column-gap override.
const CONTACT_GRID =
  'grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-x-(--spacing-gutter-lg)'
const DETAIL_VALUE = 'mt-1.5 text-body text-text'
const IDENTIFIER_LINK = 'font-mono text-[14px] leading-[1.5] break-all text-link'

function DetailRow({ testId, label, children }: { testId: string; label: string; children: ReactNode }) {
  return (
    <div data-testid={testId}>
      <dt className={MICRO_LABEL}>{label}</dt>
      <dd className={DETAIL_VALUE}>{children}</dd>
    </div>
  )
}

/**
 * `/contact`. No `Section` label: the page title already names the page, and a
 * label here would stack directly above the first detail's own label.
 */
export function Contact({
  details,
  headingLevel,
  formIdPrefix,
}: {
  details: ContactDetails
  /** `'h2'` only in the /preview/components gallery, which has its own `<h1>`. */
  headingLevel?: 'h1' | 'h2'
  formIdPrefix?: string
}) {
  return (
    <div>
      <PageTitle title="Contact" headingLevel={headingLevel} />
      <Section borderTop={false}>
        <div className={CONTACT_GRID}>
          <dl data-testid="contact-details" className="flex min-w-0 flex-col gap-6">
            {details.email && (
              <DetailRow testId="contact-email" label="Email">
                <a href={`mailto:${details.email}`} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
                  {details.email}
                </a>
              </DetailRow>
            )}
            {details.phone && (
              <DetailRow testId="contact-phone" label="Phone">
                <a href={telHref(details.phone)} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
                  {details.phone}
                </a>
              </DetailRow>
            )}
            {details.address && (
              <div data-testid="contact-address">
                <dt className={MICRO_LABEL}>Address</dt>
                {/* `whitespace-pre-line`: the editor's line breaks are the address's lines. */}
                <dd className={`${DETAIL_VALUE} whitespace-pre-line break-words`} data-cms-verbatim>
                  {details.address}
                </dd>
              </div>
            )}
            <DetailRow testId="contact-university" label="University">
              <a href={UNIVERSITY_URL} className="text-link underline">
                {UNIVERSITY_NAME}
              </a>
            </DetailRow>
          </dl>
          <ContactForm idPrefix={formIdPrefix} />
        </div>
      </Section>
    </div>
  )
}
```

- [ ] **Step 8: Widen the query, and wire the route.** In `lib/sanity.queries.ts`'s `settingsQuery`, change `contact{ email },` to `contact{ email, phone, address },`. Run `npm run typegen`. Expected: `SettingsQueryResult['contact']` gains `phone` and `address`. `fallbackSettings.contact` stays `null`, and `enquiryEmail` is unaffected.

Replace the default export and imports of `app/contact/page.tsx`. Keep `getData`, `description` and `generateMetadata` exactly as they are.

```tsx
import { contactDetails } from 'components/redesign/contactModel'
import { Contact } from 'components/redesign/screens/Contact'
import Layout from 'components/shared/Layout'
```

```tsx
export default async function ContactPage() {
  const { settings } = await getData()

  if (settings.showContactForm === false) {
    notFound()
  }

  return (
    <Layout settings={settings} childrenStyles="px-0">
      <Contact details={contactDetails(settings.contact)} />
    </Layout>
  )
}
```

Delete the legacy form, and check that nothing else still uses it:

```bash
git rm components/pages/contact/Contact.tsx components/pages/contact/ContactForm.tsx components/pages/contact/ErrorDialog.tsx components/pages/contact/SuccessScreen.tsx
grep -rn "success.svg\|pages/contact" app components lib || git rm public/success.svg
```

If the grep prints anything, stop and report it: a remaining consumer means the file stays.

- [ ] **Step 9: Add the gallery fixtures and instances.** In `components/redesign/fixtures.ts`:

```ts
import type { ContactDetails } from './contactModel'

// Every row set, with a two-line address.
export const CONTACT_DETAILS_FIXTURE: ContactDetails = {
  email: 'lab@example.org',
  phone: '+61 2 9351 0000',
  address: 'Laboratory of Molecular Neuroscience and Dementia\nThe University of Sydney NSW 2006',
}

// Production today: no settings.contact at all.
export const CONTACT_DETAILS_EMPTY_FIXTURE: ContactDetails = { email: null, phone: null, address: null }
```

In `app/preview/components/Gallery.tsx`, import `Contact` and both fixtures. After `gallery-resources`, add the block below. The `formIdPrefix` values keep the two forms' field ids apart from each other, and from the `gallery-form-field` section's own "name"/"message" ids.

```tsx
      <section data-testid="gallery-contact" className="col-start-2 px-6">
        <Heading>Contact screen</Heading>
        <div className="border border-rule">
          <Contact details={CONTACT_DETAILS_FIXTURE} headingLevel="h2" formIdPrefix="gallery-contact-" />
        </div>
      </section>

      <section data-testid="gallery-contact-empty" className="col-start-2 px-6">
        <Heading>Contact screen -- no details on file</Heading>
        <div className="border border-rule">
          <Contact details={CONTACT_DETAILS_EMPTY_FIXTURE} headingLevel="h2" formIdPrefix="gallery-contact-empty-" />
        </div>
      </section>
```

- [ ] **Step 10: Run the tests to verify they pass.**

Run: `npx vitest run components/redesign/contactModel.test.ts` → PASS.
Run: `rm -rf .next/cache/fetch-cache && npx playwright test -c playwright.alt.config.ts e2e/contact.spec.ts e2e/redesign-components.spec.ts e2e/label-budget.spec.ts e2e/axe.spec.ts e2e/routes.spec.ts e2e/json-ld.spec.ts e2e/theme.spec.ts e2e/mobile.spec.ts e2e/section-label.spec.ts` → PASS on all three projects.

- [ ] **Step 11: Prove the new CSS.**

```bash
npm run css:proof -- --grep '.lg\:grid-cols-\[minmax\(0\,1fr\)_minmax\(0\,1\.6fr\)\]'
npm run css:proof -- --grep '.whitespace-pre-line'
npm run css:proof -- --grep '.md\:w-auto'
npm run css:proof -- --grep '.text-\[17px\]'
```

Each exits 0. If a selector's escaping differs, grep for a distinctive fragment of it (e.g. `1\.6fr`) instead, and confirm the declaration by eye.

- [ ] **Step 12: Re-grep the legacy fonts.**

```bash
grep -rln "font-ariana\|ariana" components app styles lib
grep -rln "antarctican" components app styles lib
grep -rln "font-serif\|PT_Serif" components app styles lib
```

Expected: each still lists at least one consumer beyond `app/layout.tsx` and `styles/index.css` (Ariana: `TimelineItem`, `Header`, `Page`, `ProjectPage`; Antarctican: `Logo`/`--font-sans` history; PT Serif: its legacy consumers). So no face is removed. Record the exact output in the decisions doc. If a face shows **no** consumer outside `app/layout.tsx`/`styles/index.css`, remove it there too, and add it to this task's commit.

- [ ] **Step 13: Run the full gates and e2e.** `npm run type-check`, `npm run lint` (0 errors, 4 warnings), `npx vitest run`, `npm run typegen` (no diff beyond Tasks 3 and 5), `npm run build`, and `npx playwright test -c playwright.alt.config.ts` on all three projects. Record the counts. Restore `next-env.d.ts` and delete `playwright.alt.config.ts`.

- [ ] **Step 14: Commit the code.**

```bash
git add components/redesign/contactModel.ts components/redesign/contactModel.test.ts components/redesign/ContactForm.tsx components/redesign/screens/Contact.tsx components/redesign/FormField.tsx lib/sanity.queries.ts sanity.types.ts app/contact/page.tsx components/redesign/fixtures.ts app/preview/components/Gallery.tsx e2e/contact.spec.ts e2e/label-budget.spec.ts e2e/redesign-components.spec.ts
git commit -m "feat(contact): rebuild Contact on the redesign shell with settings.contact details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The `git rm` deletions from Step 8 are already staged, and go into this commit.

- [ ] **Step 15: Check against wix-preview and take the screenshots.** Build and serve against the verification dataset, then capture 1440 and 375 screenshots of `/people`, `/people/damian-holsinger`, `/research` and `/contact`:

```bash
rm -rf .next/cache/fetch-cache
NEXT_PUBLIC_SANITY_DATASET=wix-preview npm run build
NEXT_PUBLIC_SANITY_DATASET=wix-preview npx next start -p 3100 &
mkdir -p .superpowers/screenshots/after-pr4
for route in people people/damian-holsinger research contact; do
  name=$(echo "$route" | tr '/' '-')
  npx playwright screenshot --full-page --viewport-size "1440, 900" "http://localhost:3100/$route" ".superpowers/screenshots/after-pr4/$name-1440.png"
  npx playwright screenshot --full-page --viewport-size "375, 812" "http://localhost:3100/$route" ".superpowers/screenshots/after-pr4/$name-375.png"
done
NEXT_PUBLIC_SANITY_DATASET=wix-preview npx playwright test -c playwright.alt.config.ts e2e/people.spec.ts e2e/lab-head-spotlight.spec.ts e2e/research.spec.ts e2e/contact.spec.ts --project=chromium
kill %1
git checkout origin/redesign/integration -- next-env.d.ts
```

Before running the e2e line, set `reuseExistingServer: true` in the alt config for this run only, so it uses the wix-preview server. Expected: pass. The `.superpowers/` directory is git-ignored. The "before" set is in `.superpowers/screenshots/before/` in the main checkout.

- [ ] **Step 16: Write the docs.**
  - **`docs/redesign-experiment/phase-3-decisions.md`:** append "## Revision PR 4 — People, PI profile, Research, Contact" with:
    - what changed, one line per screen;
    - all fifteen rulings from this plan, with ruling 1 marked as a spec deviation and its confirmation recorded;
    - finding 11's People instances marked closed (both stacked inner labels removed), and the Contact page's "no label" choice;
    - that the spec's PR 3 author-bolding bullet shipped here;
    - the legacy-font grep result;
    - a verification table with the Step 13 counts, and the wix-preview check.
  - **`docs/redesign-experiment/preview-walkthrough.md`:** rewrite the People, Research and "Contact and the other pages" paragraphs to describe the new blocks and which CMS fields fill each (group labels come from role groups; Publications (n) comes from the surname in author lists; Contact details come from Settings → Contact details).
  - **The spec:** under "PR 4", record the deviations as shipped: ruling 1 (Research labels) and ruling 5 (the spotlight shows the short bio).
- [ ] **Step 17: Commit the docs.**

```bash
git add docs/redesign-experiment/phase-3-decisions.md docs/redesign-experiment/preview-walkthrough.md docs/superpowers/specs/2026-09-23-redesign-revision-design.md
git commit -m "docs: record revision PR 4 decisions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

**Spec coverage:**

| Spec bullet | Where |
|---|---|
| People: one continuous grid with a small group label on each card, no half-empty rows | Task 3 (`flattenMembers`, `CARD_GRID`, `person-card-group`) |
| People: groups in `orderRank` order, flowing continuously | Task 3 (`groupByRoleGroup` order, flattened; the live e2e compares the ordered sequence) |
| People: a quiet initials tile | Task 3 (`PortraitFrame` fallback, `portrait-initials` e2e) |
| People: alumni in 3–4 columns from `md`, 1 on phones | Task 3 (`ALUMNI_GRID`, column-count e2e) |
| PI profile: Publications (n) via the surname-token matcher and `PublicationRow` | Tasks 1 and 2 |
| PI profile: an email button when `email` is set | Task 2 |
| Spotlight: "Profile and publications →" only when the profile says more | Tasks 1 and 3 (`profileSaysMore`, `countPublicationsByPerson`) |
| Research: labels are not the first tag | Task 4 (ruling 1; the literal reading is escalated) |
| Research: the meta counts only non-empty resolved bodies | Task 4 |
| Contact: `settings.contact` email, phone and address; the University constant | Task 5 |
| Contact: the Formspree form restyled, behaviour unchanged | Task 5 (payload and error-path e2e) |
| Contact: stacked below `lg` | Task 5 (layout e2e) |
| Spec §1.1: revisit the legacy fonts after Contact | Task 5, Step 12 |
| Finding 11's People instance | Task 3 (ruling 7) |

**Type consistency:** these names match between their producing and consuming tasks: `surnameOf`, `hasAuthor`, `findAuthorToken`, `toPublicationFor`, `publicationsByPerson`, `countPublicationsByPerson` (Task 1 → 2, 3), `MemberCard`, `flattenMembers`, `roleLine`, `profileSaysMore` (Task 3), `hasBodyText`, `countProjectsWithBody` (Task 4), and `ContactDetails`, `contactDetails`, `telHref`, `UNIVERSITY_URL`, `UNIVERSITY_NAME` (Task 5). `PersonCard`'s `role` becomes optional in Task 3 before any caller passes `null`.

**Review Focus → owning test:**
1. Task 1 `hasAuthor`/`findAuthorToken` tests.
2. Task 1 `surnameOf` and `publicationsByPerson`/`countPublicationsByPerson` tests.
3. Task 3 `profileSaysMore` tests and gallery (c).
4. Task 5 `contactDetails` tests and the `gallery-contact`/`gallery-contact-empty` e2e.
5. Task 4 `hasBodyText` tests and `gallery-research-empty-bodies`.

