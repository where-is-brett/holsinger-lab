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
