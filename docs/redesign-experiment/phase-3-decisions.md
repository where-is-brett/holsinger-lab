# Phase 3 — layout and site chrome: decisions and state

Every departure from the plan, and why. Companion to `phase-1-decisions.md` and
`phase-2-decisions.md`. Written 2026-09-22. Branch `redesign/phase-3-layout`, off
`redesign/integration`.

## Status

| Phase 3 step                                                    | State                              |
| ----------------------------------------------------------------- | ----------------------------------- |
| 1. Rebuild `Layout` / navbars on `SiteNav` / `MobileHeader` / `SiteFooter` | done — this document |
| 2. Build the five screens (Publications, People, Research, Resources, Home) | open |
| 3. Re-derive the `:root[data-theme='warm']` presets                | **done early** — cherry-picked, see "Step 3, done early" below |
| 4. Retire `project`, migrate `home.showcaseProjects`, redirects   | open |

## The wrap check — measured

On a production build of `redesign/integration`, at 768px:

- **Today's live nav** (`DesktopNavBar`: wordmark + Home / Publications / People /
  Contact) fits on one row — about 630px of content. The Phase 1 worry does not
  reproduce with the CMS's current single menu item.
- **The redesign `SiteNav`, with the design's hardcoded wordmark, does not fit** —
  wordmark "Holsinger Lab — The University of Sydney" plus the IA's six links plus
  padding and gap comes to about 907px, and the wordmark wraps to two lines inside
  the 52px bar.

This is why decision 2 and its amendment exist, and why this step ships an automated
width check — axe and the token guards cannot see a wrap.

`e2e/nav-wrap.spec.ts` measures both the live site and a long-`siteName` gallery
fixture ("Laboratory of Molecular Neuroscience and Dementia", with the IA six):

- at 768, 900 and 1023px the short wordmark shows, needing 680px;
- at 1024 and 1280px the long wordmark shows, needing 983px;
- the margin at 1024px is only 41px. A `siteName` much longer than the fixture
  clips with an ellipsis instead of wrapping — the `truncate` safety net in
  decision 2 is what catches it, not extra width.

## Step 3, done early

Two commits were cherry-picked from `origin/claude/adoring-ride-si6e4o` onto this
branch: `39ada6b` (`build: emit the generated stylesheet without a data-connected
build`) and `48d091a` (`feat: re-derive the warm preset against the Modern
Instrument palette`). Together they are Phase 3 step 3 done early, ahead of the
screens step.

- **`npm run css:proof`** (`scripts/css-proof.mjs`) runs the same Tailwind
  pipeline `postcss.config.js` gives Next — same plugin, same entry stylesheet,
  same source scan — with no data fetching, and writes the generated stylesheet
  to `node_modules/.cache/css-proof/index.css`. `--grep TEXT` prints only the
  matching lines and exits non-zero when there are none. `npm run build` proves
  the same fact but also statically renders every route, so it needs network
  reach to the Sanity dataset; `css:proof` keeps the "grep what Tailwind
  actually emitted" rule enforceable in an environment (like this worktree) that
  cannot reach the API.
- **The warm preset re-derivation** extends the same guard the tokens already
  had: Phase 1 added five tokens to base and left the presets declaring only the
  original nine, so `warm` inherited cool blue-grey neutrals onto a warm
  surface, including a contrast defect (`--sem-text-faint` at 4.455:1 on
  `--sem-surface-raised` in dark mode, under AA). Four neutrals are now declared
  per scheme, re-derived into the preset's own hue family, keeping each base
  token's tuned lightness and chroma; only warm's dark `--sem-text-faint` needed
  its lightness moved (by 0.010), which takes it to 4.61:1 on raised and 5.41:1
  on surface. `--sem-link-inverse` is deliberately not redeclared — it is
  chromatic, and presets vary neutrals only. This is the preset contrast guard
  from `phase-1-decisions.md` extended to the tokens step 3 originally covered.

## Decisions

1. **Nav items are code-owned, from the IA.** The IA's six (Home · Publications ·
   Research · Resources · People · Lab) live in one module, `navModel.ts`. An item
   renders only when its route exists — today Home, Publications, People, and
   Contact standing in for Lab until Lab ships in step 2. Reason: the CMS's
   `menuItems` field cannot express the IA's fixed six plus per-item "does the route
   exist yet" gating, and code review of the nav should not require a Studio diff.
   *Amended:* this does not retire `menuItems`, `showPublications`, `showPeople` or
   `showContactForm` — they stay in the schema, untouched, simply unread by the
   redesign chrome — because a parallel Wix-lookalike track (`redesign/wix`) builds
   on the same schema and dataset and may still read them. For the same reason,
   nothing here plans or pre-empts the `project` type's retirement.
2. **Wordmark text comes from `resolveBranding`; `siteName` at `lg` and up.**
   Reason: the CMS is the source of truth for the lab's name. *Amended:* `shortName`
   is used **below `lg`** — on the desktop nav between `md` and `lg`, and on mobile —
   because the measured wrap above shows the long wordmark does not fit until `lg`.
   `shortName` falls back to `siteName`, and today both resolve to "Holsinger Lab"
   since the CMS leaves `shortName` unset. If `settings.logo` is set, the Phase 4B
   `Logo` image renders instead of the text. As a last-resort safety net, the text
   wordmark is single-line and truncates with an ellipsis (`title` carries the full
   name), so a long CMS value can clip but can never break the bar's height.
3. **The mobile menu keeps the Headless UI `Dialog`**, for the focus trap, Escape,
   scroll lock and `inert` that e2e already guards, restyled as the design's sheet.
   The panel draws its own copy of the header band at the same position as the band
   beneath it. Reason: this removes both transparent-overlay / click-passthrough
   mechanisms `MobileNavBar.tsx` needed — nothing outside the dialog needs to stay
   clickable while it is open, so a whole defect class goes away with the file.
4. **One sticky header** (`sticky top-0`) at every width, replacing today's `fixed`
   mobile bar and sticky desktop bar. Reason: one positioning mechanism instead of
   two removes the mobile fixed-bar space compensation from `<main>`, while keeping
   the same visual spacing.
5. **Footer = `SiteFooter` styling, content from `settings.footer`.** Each
   non-empty portable-text block becomes one line; the live value is already exactly
   the IA's two lines; an empty field falls back to the IA text. Marks and links
   flatten to plain text since the live content has none. Reason: the copyright year
   stays editable in the CMS rather than frozen in code.
6. **The current page comes from the URL** (`usePathname`), Home matching `/`
   exactly and every other item matching its href or any path beneath it (so
   `/publications/x` marks Publications). Reason: this needs no per-page prop
   threading and stays correct as screens are added in step 2.

## Departures during execution

- **Task 2:** `block` moved out of the shared `WORDMARK` string onto the short span
  alone. Putting both `block` and `hidden` on the same element is the "two
  utilities, same property" trap phase-1-decisions.md already warns about — the
  later-generated one would have won and hidden the wordmark outright.
- **Task 4:** `MobileHeader`'s root became a `<header>` element. With the closed
  band's wordmark sitting outside any landmark, axe's `region` rule failed.
- **Task 4:** the `Dialog` root became `fixed inset-0` rather than `relative`. A
  `relative` root collapsed to a zero-size box, and Playwright read the dialog as
  invisible.
- **Task 4:** the toggle became a fixed `w-16`, so "Menu" and "Close ✕" occupy
  identical boxes and the in-panel Close sits exactly over the outer Menu. The
  in-panel Close takes initial focus (`data-autofocus`).
- **Task 4:** the in-panel toggle's accessible name is "Close", with the ✕ glyph
  `aria-hidden`, where the spec says "Close ✕". Deliberate: this is
  label-in-name (the accessible name is a prefix of the visible text), and the
  ✕ is decorative — it repeats what "Close" already says, so hiding it from the
  accessibility tree does not lose information.

## Deletions and the Wix-track caution

`components/global/Navbar/` (three files) and `components/global/Footer.tsx` are
removed; `components/global/Logo.tsx` and `lib/logo.ts` stay, since image mode is
still used. Two old geometry pass-through e2e tests are deleted, along with the
`logo-contract` assertion that read `MobileNavBar.tsx` — the mechanisms they guarded
no longer exist.

**Coordinate with `redesign/wix` before going further.** `menuItems`,
`showPublications`, `showPeople`, `showContactForm` and the `project` type must not
be retired without checking with that track first — it may read them. Deleting
`components/global/Navbar/*` and `Footer.tsx` here can conflict with `redesign/wix`
at merge time, but only if that branch has also edited those specific files.

## What step 2 must do to the nav model

`navModel.ts`'s `SITE_NAV` currently has `research`, `resources` and `lab` marked
`live: false`, with `contact` standing in for `lab`. Step 2 must:

- flip `live` to `true` on `research`, `resources` and `lab` as each route ships;
- remove the `contact` stand-in entry once `lab` is live, per the comment already
  in `navModel.ts`.

## Known limits, carried forward

- **The nav ignores `showPublications` / `showPeople` / `showContactForm`.**
  Those flags still make `/publications`, `/people` and `/contact` return 404
  when set to false, but the new chrome keeps linking to them regardless, and
  their Studio descriptions promise the page "disappears from the site
  entirely" — a promise the redesign chrome no longer keeps. The command
  centre's amendment (decision 1) kept these fields unread by the redesign
  because the `redesign/wix` track may still read them. This is an open
  decision for Brett: either wire the three flags into `liveNavItems` (about 5
  lines plus unit tests, no schema change), or accept the current behaviour.
  Relatedly, the `menuItems` Studio description is now inert, since the nav no
  longer reads `menuItems` at all — noted here as a handover follow-up, not
  fixed in this branch.
- In draft mode, the `PreviewBanner` sits above the sticky header, so the outer
  band and the panel band misalign by about 45px. Editors only.
- Scroll lock adds scrollbar-width padding, so the in-panel Close shifts on desktop
  browsers with classic (non-overlay) scrollbars.
- Nothing guards that an uploaded `settings.logo` actually reaches the header, and
  `Logo`'s SVG wordmark mode 3 is no longer reachable from the header.
- `--sem-rule-strong`'s 1.62:1 contrast target and the type-token consolidation
  from `phase-1-decisions.md` are still open, carried into the screens step.

## Verification

| Command               | Baseline (Task 4, pre-existing)  | Now                                                    |
| ---------------------- | --------------------------------- | ------------------------------------------------------- |
| `npm test`             | 351 passed, 41 files              | 369 passed, 42 files (+22 `navModel`, −4 obsolete `logo-contract`) |
| `npm run type-check`   | clean                             | clean                                                    |
| `npm run lint`         | 0 errors, 4 warnings              | 0 errors, 4 warnings                                     |
| `npm run typegen`      | clean, 16 queries, 36 schema types | not re-run — no query or schema changed                 |
| `npm run build`        | 23 routes                         | 23 routes                                                |
| `npm run test:e2e`     | 102 passed / 5 skipped            | 117 passed / 5 skipped                                   |
