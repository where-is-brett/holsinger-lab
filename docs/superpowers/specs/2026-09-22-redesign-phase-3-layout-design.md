# Redesign Phase 3, step 1 — Layout and site chrome

Date: 2026-09-22. Branch `redesign/phase-3-layout`, off `redesign/integration`, PR back
into it. `main` is not touched.

Scope: step 1 of Phase 3 from `docs/redesign-experiment/phase-3-start-here.md`. Rebuild
`components/shared/Layout.tsx` and the site chrome on the redesign primitives
`SiteNav` / `MobileHeader` / `SiteFooter`, and settle the 768–1024px desktop-nav wrap
check carried over from Phase 1. The screens themselves (Home, Publications, People,
Research, Resources) are step 2 and are **not** in scope: the old page bodies keep
rendering inside the new chrome until then.

Decisions 1–6 below were approved by the command centre on Brett's behalf on
2026-09-22, including two amendments (folded in, marked *amended*).

## Prior art brought in

`origin/claude/adoring-ride-si6e4o` left two commits on top of `redesign/integration`.
Both were reviewed and cherry-picked unchanged:

- `build: emit the generated stylesheet without a data-connected build` —
  `npm run css:proof [-- --grep TEXT]`. Runs the same Tailwind/PostCSS pipeline Next
  uses, with no Sanity fetch; `--grep` exits 1 when nothing matches. Verified
  locally. Every component task in this step uses it for the Phase 1 empirical-CSS
  rule, in addition to `npm run build`.
- `feat: re-derive the warm preset against the Modern Instrument palette` — this is
  Phase 3 step 3, done early. It adds four neutrals per scheme to
  `:root[data-theme='warm']` and extends the preset contrast guard to cover
  `--sem-text-faint` on both surfaces and `--sem-text-inverse-muted` on the inverse
  surface. `npm test` stays at 351 because the new assertions sit inside existing
  `it`s.

## The wrap check — measured

On a production build of `redesign/integration`, viewport 768px:

- **Today's live nav** (`DesktopNavBar`: wordmark + Home / Publications / People /
  Contact) fits on one row: about 630px of content. The Phase 1 worry does not
  reproduce with the CMS's current single menu item.
- **The redesign `SiteNav` does not fit.** Wordmark "Holsinger Lab — The University of
  Sydney" = 336px, the IA's six links = 483px, padding 64px, gap 24px, so about
  907px. Below that the wordmark wraps to two lines (36px tall) inside the 52px bar.

This is why decision 2 and its amendment matter. It is also why this step adds an
automated width check (see Testing), because axe and the token guards cannot see a
wrap.

## Decisions

1. **Nav items are code-owned, from the IA.** The IA's six (Home · Publications ·
   Research · Resources · People · Lab) live in one module. An item renders only when
   its route exists. Today that means Home, Publications, People, and Contact
   standing in for Lab until Lab ships in step 2. The CMS fields `menuItems`,
   `showPublications`, `showPeople` and `showContactForm` stay in the schema,
   untouched, and are simply not read by the redesign chrome. *Amended:* this spec
   does not plan their retirement. A parallel Wix-lookalike track (`redesign/wix`)
   builds on the same schema and dataset and may read them. For the same reason,
   nothing here plans or pre-empts the `project` retirement.
2. **Wordmark text comes from `resolveBranding`.** `siteName` is used at `lg` (1024px)
   and up. *Amended:* `shortName` is used **below `lg`**, on the desktop nav between
   `md` and `lg` as well as on mobile. `shortName` falls back to `siteName`, and today
   both resolve to "Holsinger Lab" because the CMS leaves them unset. If
   `settings.logo` is set, the Phase 4B `Logo` image renders instead of the text, so
   branding keeps working. As a last-resort safety net, the text wordmark is
   single-line and truncates with an ellipsis (`title` carries the full name). That
   way a long CMS value can clip, but it can never break the bar's height. The width
   check below asserts it does not clip for realistic values.
3. **The mobile menu keeps the Headless UI `Dialog`** for focus trap, Escape, scroll
   lock and `inert`, all of which are guarded by e2e today. It is restyled as the
   design's sheet. The panel draws its **own copy of the header band** (wordmark link
   + CLOSE toggle) at the same position as the band beneath it. That removes both
   transparent overlay / click-passthrough mechanisms in `MobileNavBar.tsx`: nothing
   outside the dialog ever needs to be clickable while it is open.
4. **One sticky header** (`sticky top-0`) at every width. It replaces today's
   `fixed` mobile bar and sticky desktop bar. `<main>` loses the fixed-bar
   compensation but keeps the same visual spacing (see Layout).
5. **Footer = `SiteFooter` styling, content from `settings.footer`.** Each non-empty
   portable-text block becomes one line. The live value is already exactly the IA's
   two lines. If the field is empty, it falls back to the IA text. The copyright year
   stays editable in the CMS rather than frozen in code. Marks and links in the footer
   are flattened to plain text; the live content has none.
6. **The current page comes from the URL** (`usePathname`). Home matches `/`
   exactly. Every other item matches its href or any path under it, so
   `/publications/x` marks Publications.

## Units

All new files live in `components/redesign/`. No new dependencies.

### `navModel.ts` (+ `navModel.test.ts`) — pure, no React

Named `navModel` rather than `siteNav` on purpose: `siteNav.ts` next to `SiteNav.tsx`
would collide on a case-insensitive filesystem, as `publicationRow.ts` /
`PublicationRow.tsx` already do (phase-1-decisions.md).

- `NavItem = { id: NavId; label: string; href: string }`
- `SITE_NAV: readonly (NavItem & { live: boolean })[]` — the IA's six, in IA order,
  plus `contact` (href `/contact`, live) placed where Lab sits. `research`,
  `resources` and `lab` are `live: false` with their future hrefs (`/research`,
  `/resources`, `/lab`). A comment says Contact is Lab's stand-in and is removed when
  Lab goes live.
- `liveNavItems(): NavItem[]` — the live ones, in order. Today:
  Home, Publications, People, Contact.
- `currentNavId(pathname: string | null, items: NavItem[]): NavId | undefined` —
  rule 6. It tolerates a trailing slash and `null` (which `usePathname` can return).
- `footerLines(blocks: unknown): string[]` — decision 5. It takes the raw
  `settings.footer` value, keeps `_type === 'block'`, joins each block's `children[].text`,
  trims, and drops empty lines. On `null` / `undefined` / non-array / empty it returns
  `FOOTER_FALLBACK` = `['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab']`.

`NAV_ITEMS` in `SiteNav.tsx` (fixture-shaped, `#` hrefs) is replaced by the model.
The gallery uses `SITE_NAV` (all six, including the non-live ones) so the full IA nav
stays on display there.

### `SiteNav.tsx` — desktop bar, rebuilt

```ts
interface SiteNavProps {
  items: NavItem[]
  current?: NavId
  wordmark: { long: string; short: string }
  logo?: ReactNode // pre-rendered <Logo>, when settings.logo is set
}
```

- It renders real `next/link` hrefs. `onNavigate`, the `#id` hrefs and `'use client'`
  go, so it becomes a server-renderable component.
- `<nav aria-label={label}>`, optional `label` prop defaulting to `"Primary"`, so the
  landmark has a name. The gallery renders several instances at once and passes a
  distinct label to each, or axe's landmark-unique rule trips.
- Wordmark link to `/`: if `logo` is given, it renders that with `aria-label="Home"`
  on the link. Otherwise it renders two spans: `short` visible below `lg`, `long` from
  `lg`. Each span is `truncate` and carries `title`. The link is `min-w-0`; the nav is
  `shrink-0`.
- Classes and visual detail stay as they are (they already follow the vendored
  source), including the `NAVLINK` / `NAVLINK_CURRENT` split.
- No background of its own; the sticky wrapper in `SiteChrome` provides it.

### `MobileHeader.tsx` — rebuilt around `Dialog`

```ts
interface MobileHeaderProps {
  items: NavItem[]
  current?: NavId
  wordmark: string // shortName
  logo?: ReactNode
}
```

- Stateful `'use client'`. It owns `open`, and closes when the viewport reaches `md`
  (the `matchMedia('(min-width: 48rem)')` change event replaces the old `resize`
  listener).
- The band has the wordmark link to `/` and a toggle `<button aria-expanded
  aria-controls="mobile-menu-panel">`. The toggle's accessible name **is its visible
  text**, "Menu", with no `aria-label` (WCAG 2.5.3, label in name). It is still
  rendered uppercase via CSS.
- `Dialog` (`transition`, `unmount={false}`, `aria-label="Menu"`): `DialogPanel
  id="mobile-menu-panel"`, fixed and full-viewport, `bg-surface`. Contents:
  1. the band again: wordmark link (with `onClick` close) + toggle reading "Close ✕",
     `aria-expanded`, `onClick` close. It is identical in geometry to the outer band,
     because both render the same exported `MobileBand` sub-component.
  2. `MobileNavRows` (exported, presentational): the numbered rows from the source,
     `aria-current`, `onClick` close.
  3. the "The University of Sydney" line from the source.
- Escape and focus return come from `Dialog`. Focus goes back to the outer "Menu"
  toggle.
- The source's text sizes stay (9.5px band, 14px rows). The `min-w-11` toggle floor
  from Phase 1 stays.

### `SiteFooter.tsx`

```ts
interface SiteFooterProps { lines: string[] }
```

It renders one `<span>` per line. It is compact (column, gutter padding, 8.5px) below
`md` and default (row, `px-8`, 11px) from `md`, using responsive variants. That is
safe under the "two utilities, same property" rule because the pairs sit behind
different breakpoints, and the plan requires a css:proof check of the pair. The
`compact` prop goes away. The gallery shows the footer at both widths.

### `SiteChrome.tsx` — the client seam

```ts
'use client'
function SiteChrome(props: {
  wordmark: { long: string; short: string }
  logo?: ReactNode
  items: NavItem[]
})
```

It calls `usePathname()`, computes `currentNavId`, and renders:

```tsx
<div data-testid="site-header" className="sticky top-0 z-40 bg-surface">
  <div className="hidden md:block"><SiteNav … /></div>
  <div className="md:hidden"><MobileHeader … /></div>
</div>
```

`logo` crosses the RSC boundary as an already-rendered server element, which is
allowed; functions are not passed across it. With JS disabled, both bars still
server-render (static routes prerender `usePathname`).

### `components/shared/Layout.tsx`

- Keeps its signature (`settings`, `childrenStyles`), so none of the seven callers
  change.
- Resolves branding and `logo` / `logoDark` (rendering `<Logo>` only when
  `settings.logo` is set), gets `liveNavItems()`, and renders `SiteChrome`, `<main>`
  and `<SiteFooter lines={footerLines(settings.footer)} />`.
- `<main>`: `mt-32 md:mt-16` becomes `mt-20 md:mt-16`, keeping content exactly where
  it sits today. Mobile content used to start 128px from the top under a 48px fixed
  bar (80px of space). Desktop was already in-flow. Gutter classes are unchanged.

### Removed

`components/global/Navbar/` (three files) and `components/global/Footer.tsx`.
`components/global/Logo.tsx` and `lib/logo.ts` stay: image mode is still used.
`logo-contract.test.ts`'s assertion that reads `MobileNavBar.tsx` goes with the file.
The overlay-width coupling it guarded no longer exists. Deleting these can conflict
with `redesign/wix` at merge time only if that branch edits them; the PR will say so.

## Testing

- **Unit (vitest):** `navModel.test.ts` covers the live list and order, every
  `currentNavId` case (`/`, `/publications`, `/publications/slug`, trailing slash,
  `/people/x`, `/unknown`, `null`), and every `footerLines` case (live shape, empty
  blocks, non-block types, `null`, junk input).
- **css:proof** for each component task: `h-(--nav-height)`, `truncate`,
  `lg:inline` / `lg:hidden`, the footer's responsive pairs, `sticky` / `top-0` /
  `z-40`.
- **e2e, rewritten:**
  - `mobile-menu.spec.ts`: open/close, `aria-expanded`, Escape plus focus return,
    scroll lock, a link click navigates and closes, the logo/wordmark tap inside the
    open sheet goes home and closes, and the resize-to-`md` close. Button names become
    "Menu" / "Close ✕". The two geometry pass-through tests are deleted, because the
    mechanism they guarded is gone.
  - `nav-logo.spec.ts`: target `[data-testid=site-header]`. Keep "the Publications
    sticky bar sits at the bottom of the header" at desktop *and* mobile. The logo
    assertion becomes "the header shows the wordmark link to /" (the live CMS has no
    logo).
  - `server-rendered-nav.spec.ts`: JS off, desktop shows the Publications link;
    mobile shows the band's wordmark and "Menu".
  - `axe.spec.ts` and `redesign-components.spec.ts`: update selectors and names.
- **e2e, new: `nav-wrap.spec.ts`** (*amended*). At 768, 900, 1023, 1024 and 1280px:
  - on `/` (live data): the header is exactly `--nav-height` tall, every nav link
    shares one `top`, and no wordmark span is clipped (`scrollWidth <=
    clientWidth`).
  - on `/preview/components`, a gallery `SiteNav` instance (`data-testid=
    "gallery-site-nav-long"`) with all six IA items and
    `wordmark = { long: 'Laboratory of Molecular Neuroscience and Dementia', short:
    'Holsinger Lab' }`. The same three assertions apply at every width at or above
    `md`. This is the fixture that stops a future Settings edit from quietly
    reintroducing the wrap.
- **Manual eyeball at the end** (the whole-branch check): `/`, `/publications`,
  `/people`, `/contact` at 375, 768, 1024 and 1280, light and dark, with the menu
  open.

## Out of scope

The screen rebuilds (step 2), `project` retirement and redirects (step 4), and any
schema change, including the four nav CMS fields (decision 1 amendment). Also out:
`--sem-rule-strong`'s 1.62:1, and the type-token consolidation. Both are recorded in
phase-1-decisions.md for the screens step.
