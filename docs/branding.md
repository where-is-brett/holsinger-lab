# Branding

Site-wide branding is edited in Sanity Studio under **Settings → Identity**, not in code.

## Resolution order

`resolveBranding` (`lib/branding.ts`) owns the fallback chain and is the only place that knows it:

1. `settings.siteName` — set by the lab in Studio
2. `fallbackSiteName` in `lib/site.ts` — used when the field is empty, whitespace-only, or the
   settings document cannot be fetched

`shortName` falls back to the resolved `siteName`.

Nothing else may import `fallbackSiteName`. Consumers take a resolved `siteName` as a required
parameter — `buildMetadata` and `buildOrganizationJsonLd` both do — so a call site that forgets is a
type error rather than a silently hardcoded name.

## Logo

Uploaded in Studio under **Settings → Branding**. Three render modes, in
priority order:

1. **Logo** uploaded → shown as an image, scaled to the header height.
2. **Logo (dark mode)** also uploaded → swapped in automatically when the
   visitor's device is in dark mode, via the `.logo-light`/`.logo-dark` pair in
   `styles/index.css`. No JavaScript is involved.
3. **Neither** → the short name is rendered as a wordmark inside a stroked box,
   reproducing the site's original header mark.

### Geometry is derived, never hardcoded

`lib/logo.ts`'s `resolveLogo` returns the render mode *and* the width together,
from `asset.metadata.dimensions.aspectRatio` at a fixed `LOGO_HEIGHT`. Both the
visible logo and MobileNavBar's transparent tap-overlay call it, so they cannot
drift — a logo of any aspect ratio stays tappable while the mobile menu is open.

Do not reintroduce a literal pixel width in either place. `logo-contract.test.ts`
fails the build if you do, because this failure mode is invisible: it only
manifests on touch input, only while the menu is open.

### Nav height

`--nav-height` in `styles/index.css` is the single authority (4rem mobile,
4.75rem at `md`+). Both navbars set their height from it, and the Publications
sticky bar and jump-nav offsets are positioned against it. Changing the logo
height means changing that token, not hunting for literals.

## Why the root layout's fetch cannot throw

`app/layout.tsx` wraps every route, including `/studio`. `fetchSettingsSafely` (`lib/settings.ts`)
swallows fetch failures and returns `fallbackSettings`, because an unguarded throw would take down
both the site and the CMS needed to fix it. This repo has no maintaining developer, so that failure
mode has no recovery path.

## `stega: false`

Any settings fetch whose result reaches `<title>`, Open Graph tags or JSON-LD must pass
`stega: false`. Sanity's stega encoding hides invisible characters inside strings for Visual Editing;
they are harmless in visible UI and corrupting in machine-readable output. Production is unaffected
(`lib/sanity.live.ts` uses `perspective: 'published'`), so nothing in CI will catch a mistake here.

## Still hardcoded, deliberately

- **Fonts** — four families, two licensed local `.woff2`. See the design doc §8.
- **Studio title** (`sanity.config.ts`) — Sanity config loads before any data fetch. Set via
  `NEXT_PUBLIC_SANITY_PROJECT_TITLE`.
- **`siteUrl`** — deployment configuration, set via `NEXT_PUBLIC_SITE_URL`.

## Colour

Two settings in Studio → Settings → Branding control colour.

**Brand colour** is one colour. The site derives two design tokens from it:
`--sem-link` (links, which must clear 4.5:1 against the page) and `--sem-accent`
(borders and edges, 3:1). Each is your colour, darkened in light mode or
lightened in dark mode **only as far as its contrast requirement demands** — so
a colour that is already readable is used exactly as you picked it, and one that
is not is nudged until it is. There is no colour you can enter that produces an
unreadable page: at the limit the derivation drains saturation until black or
white satisfies the requirement.

Because the two tokens have different requirements, they sometimes come out as
the same colour (when your brand colour satisfies both) and sometimes as two
shades (when it satisfies only the weaker one). Both are correct.

Leaving Brand colour empty keeps the site's built-in blue and green.

**Background tone** picks the greys — `default` (cool) or `warm` (cream and
ink). It never affects your brand colour. Both tones are checked against the
same contrast rules in `styles/tokens.test.ts`.

### Adding another background tone

1. Add `:root[data-theme='<name>']` and a matching
   `@media (prefers-color-scheme: dark)` block to `styles/index.css`. Declare all
   nine neutral tokens in **both** — a token left out of the dark block keeps its
   light value, because the preset selector outranks the base dark override.
2. Add `<name>` to `THEME_NAMES` and its two surface pairs to `PRESET_SURFACES`
   in `lib/theme.ts`.
3. Add it to the `theme` field's option list in `schemas/singletons/settings.ts`.
4. Add it to `THEMES` in `styles/tokens.test.ts`.

`npm test` then checks the new tone against every contrast rule automatically,
in both colour schemes, and fails if the CSS and `PRESET_SURFACES` disagree.
Never relax a contrast floor to make a palette pass.
