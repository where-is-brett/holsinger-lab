# Phase 4C — Colour

**Date:** 2026-08-16
**Status:** Approved; ready for planning
**Parent spec:** `2026-08-12-site-branding-customisation-design.md` §3.3 and §4
**Depends on:** Phase 4A (merged as PR #14)

This document scopes one sub-phase of the branding programme. It refines the parent spec against a
fresh read of the codebase at `origin/main`, per the programme's standing instruction to re-verify
before building. As in every prior sub-phase, the stale assumptions were in the design doc rather
than in the code — but 4C is the first where one of them was a **correctness** error in the
specified algorithm rather than a drifted file path (§1.1).

Constraints inherited from the parent spec's preamble, both load-bearing here:

1. Anything left in code is **frozen permanently** — no developer will maintain this repo after
   handover.
2. Anything editable that can be set to a broken value is a **permanent hazard**.

(2) is the entire reason this phase derives colours instead of exposing them: `brandColor` is a
free-form colour picker in the hands of a non-designer, and the derivation is what makes every
possible input safe.

---

## 1. Starting state, verified

- **Dark mode is `prefers-color-scheme` only.** There is no `data-theme` attribute anywhere in the
  repo today, and no theme toggle. Presets do not extend an existing mechanism; they introduce one.
- **`styles/index.css` has eleven `--sem-*` tokens, two of them chromatic** — `--sem-link` (#4043e7)
  and `--sem-accent` (#2d6a4f). The parent spec's count is correct.
- **`styles/tokens.test.ts` parses `styles/index.css` from disk** and asserts WCAG ratios per theme.
  It is thorough (brace-depth CSS parsing, ambiguity errors, a cross-token pairing sweep, and a
  source-scanning role-misuse guard) and it is the reason presets were chosen over free-form colour.
- **`app/layout.tsx` is a server component** that already fetches settings through
  `fetchSettingsSafely` with `revalidate = 60`, so per-request style injection is available at no
  architectural cost.
- **`@sanity/color-input@6.1.3`** declares `peerDependencies: { react: '^19.2', sanity: '^5 || ^6.0.0-0' }`,
  compatible with this repo's `sanity 6.9.1` / `react 19.2.8`.

### 1.1 Corrections to the parent spec

Each of these was found by implementing the specified algorithm as a throwaway spike and running it,
not by reading the spec.

**(a) The specified search direction is wrong.** §3.3 says "binary-search lightness until contrast
clears the requirement." Searching inward from the lightness extremes returns the *minimum-passing*
colour: every derived accent landed at 3.00–3.08:1, visibly washed out. It also breaks the parent
spec's own guarantee that `default` reproduces the current palette — brand `#2d6a4f` derived to
`#5f9b7e`, so a lab entering the site's existing green would not get the site's existing green.

The corrected rule **anchors at the brand colour's own lightness** and moves only as far as the floor
demands. `#2d6a4f` → `#2d6a4f` and `#4043e7` → `#4043e7`, exactly.

The same sentence's *method* is also wrong: bisection assumes contrast is monotonic in lightness, and
gamut clamping makes it only weakly so. §3.3 uses a fixed-step scan instead, for the reason recorded
there.

**(b) "Accent and link land at different lightnesses" is false.** §3.3 predicts the two floors
always separate the tokens. Under the corrected rule they collapse to the same hex whenever the brand
colour clears both (e.g. `#2d6a4f` for both), and diverge only when 4.5:1 binds and 3:1 does not
(orange `#ff7a00` → link `#c64600`, accent `#ea6700`). **The collapse is accepted** — see §2.

**(c) The chroma-reduction fallback never fires.** Across 48 derivations (12 brand colours × 2
presets × 2 schemes) including pure yellow, magenta, neon cyan, black and white, gamut clamping
already sheds enough chroma that lightness search alone always succeeds. The fallback is retained
because it is what makes termination *provable*, but it is a safety net, not a working step, and
should be documented as such so nobody later mistakes dead-looking code for dead code.

**(d) Contrast must be measured on the final quantized hex.** OKLCH values outside the sRGB gamut
are clamped during conversion back, which moves the real ratio. Search in OKLCH; validate in sRGB.

**(e) `tokens.test.ts` cannot guard derived colours.** It reads `index.css` from disk, and derived
values never appear there. The parent spec's "presets are automatically covered by the existing
guard" is true for presets and structurally inapplicable to `brandColor`. That guarantee has to come
from a property sweep over `lib/theme.ts` instead (§4).

**(f) Preset blocks are partial overrides.** A preset declares only the nine neutrals, but
`parseTokens` resolves each block standalone. Extending the guard to "iterate every preset" naively
would read a preset block, find no `--sem-link`, and compare `undefined` — passing silently. Presets
must be resolved **merged over** the base `:root` (§3.5).

**(g) `--sem-link` is a much narrower role than its name suggests.** Prose links in
`components/shared/CustomPortableText.tsx:95,109` are `underline` and inherit `--sem-text`; they
never touch `--sem-link`. Its only at-rest consumer is the Publications year jump-nav
(`components/pages/publications/Publications.tsx:64`) — everything else is a `hover:` state. Left
alone, `brandColor` would be nearly invisible and would read as broken. §3.6 widens it.

**(h) `@sanity/color-input` stores an object, not a string** — `{_type, hex, hsl, hsv, rgb, alpha}`.
The query and every consumer must read `.hex`.

**(i) `:root:root` is not enough specificity.** `:root[data-theme="warm"]` is (0,2,0) and `:root:root`
ties it, leaving source order to decide — the precise dependency §3.3 says not to take. §3.5 uses
(0,3,0).

---

## 2. Decision

4C ships **both** halves of the parent spec's §3.3: `brandColor` derivation *and* selectable neutral
presets, with the deferred design judgements now made:

- **Presets: `default` and `warm` only.** `default` is the current palette, unchanged and unnamed
  (it is the base `:root`). `warm` is a cream-and-warm-ink palette. A third true-grey candidate was
  built and rejected as insufficiently distinct from `default` to justify a third option a
  non-developer must choose between. Both were verified against `tokens.test.ts`'s real assertions
  before selection.
- **`brandColor` ships unset.** No `initialValue`. Unset means nothing is injected and the CSS
  defaults stand, so the site is pixel-identical the day 4C ships and changes only on a deliberate
  edit.
- **Accent and link may collapse to one value.** Each token is derived independently against its own
  floor; unity when the brand colour carries both roles, divergence when it cannot. The alternative —
  forcing a fixed OKLCH lightness step between them — was prototyped and rejected: the difference was
  not perceptible in side-by-side review, the constant is unmotivated by any stated requirement, and
  the roles are already distinguished by underline, position and typography rather than by hue. One
  sentence in the handover doc beats a tuned constant nobody can see.

---

## 3. Design

### 3.1 Schema and query

`schemas/singletons/settings.ts`, in the existing `branding` group:

- `brandColor` — type `color`, `options: { disableAlpha: true }`. Alpha is meaningless for a token
  and would silently corrupt the contrast maths.
- `theme` — `string`, radio list of `default` | `warm`, `initialValue: 'default'`.

`sanity.config.ts` registers `colorInput()` from `@sanity/color-input`.

`lib/sanity.queries.ts` adds `brandColor{hex}` and `theme` to `settingsQuery`. Selecting only `hex`
keeps the payload small and makes the object-vs-string trap (§1.1h) impossible to reintroduce
downstream.

### 3.2 `lib/color.ts` — colour space, no dependencies

Pure sRGB↔OKLCH conversion plus WCAG relative luminance and contrast. Hand-rolled per the parent
spec's reasoning: a transitive break in a colour library is unfixable after handover. Exports
`hexToOklch`, `oklchToHex`, `contrast`. No imports, no I/O, trivially testable.

`contrast` takes hex strings, never OKLCH — encoding §1.1d at the type level rather than in a comment.

### 3.3 `lib/theme.ts` — derivation

```
deriveToken(brandHex, surfaces: [string, string], target: number, direction: 'darken' | 'lighten')
```

1. Convert `brandHex` to OKLCH; hold hue and chroma.
2. If the brand colour already clears `target` against the **worse** of the two surfaces, return it
   unchanged.
3. Otherwise walk lightness in `direction` in fixed steps of `1/256` and return the **first** value
   that clears — minimal distortion from the brand colour, not from the extreme. A fixed-step scan
   rather than a binary search: gamut clamping puts small flat spots in the contrast-vs-lightness
   curve, so it is not strictly monotonic and bisection can step over the first passing value. 256
   steps is one per 8-bit level, so the scan cannot skip a representable colour, and the worst case
   is 256 conversions — negligible, and it runs once per request at most.
4. If no lightness in `[0,1]` works, reduce chroma by `0.02` and retry from step 3. Terminates
   because at chroma 0 the ramp includes pure black and pure white, either of which maximises
   contrast against any surface.

`deriveTheme(brandHex, preset)` runs it four ways: `link` at 4.5:1 and `accent` at 3:1, for light
(`darken`) and dark (`lighten`), against that preset's two surfaces.

Both functions are pure and take surfaces as arguments — no import of CSS, no global state.

### 3.4 `PRESET_SURFACES` and its drift guard

The derivation needs each preset's surface hexes **in JS**, but those hexes must live in
`styles/index.css` for `tokens.test.ts` to cover them. That is two sources of truth for the same
values.

Rather than accept it silently, `PRESET_SURFACES` in `lib/theme.ts` is checked by a test that parses
`styles/index.css` and asserts an exact match. This follows the repo's existing idiom —
`tokens.test.ts` already parses CSS — and directly targets the failure shape that produced PR #16's
Critical bug: two things that must agree, with nothing asserting that they do.

### 3.5 CSS structure and the cascade

The base `:root` keeps the **default** palette unchanged, so `default` needs no attribute and no
block of its own. Only `warm` gets `:root[data-theme="warm"]` and a matching
`prefers-color-scheme: dark` counterpart, both declaring the nine neutrals only. `app/layout.tsx`
emits `data-theme` only when the selected preset is not `default`.

When `brandColor` is set, the layout injects a `<style>` block containing a light rule and a
`@media (prefers-color-scheme: dark)` rule. It must outrank `:root[data-theme="warm"]` (0,2,0), and
`:root:root` merely ties — so the injected selector is `:root:root:root` (0,3,0). Inline `style` on
`<html>` was reconsidered and rejected again for the parent spec's reason: it cannot express a media
query, so the dark values have nowhere to live.

`tokens.test.ts` gains:

- Every preset × both schemes, each preset **resolved merged over the base `:root`** (§1.1f), run
  through the existing assertions.
- A new assertion that no preset block declares a chromatic token, encoding "presets vary neutrals
  only" as a guard rather than a convention.

### 3.6 Widening `--sem-link`

`components/shared/CustomPortableText.tsx:95,109` gain `text-link` alongside their existing
`underline`. This is the minimum change that makes `brandColor` visible where a reader actually meets
a link. The underline is kept, so colour is never the sole signal, and the derivation already
guarantees 4.5:1 for this token.

A wider audit of every token consumer was considered and rejected as unbounded refactoring stapled
to a colour feature.

### 3.7 Failure behaviour

Missing, malformed, or unparseable `brandColor` is treated as unset: no injection, no throw. The root
layout wraps every route **including `/studio`**, so an exception here would take down both the site
and the CMS needed to fix it — the same reasoning that made `fetchSettingsSafely` swallow errors.

---

## 4. Testing

**Unit — `lib/color.ts`:** round-trip conversion within tolerance; known-value checks against
published OKLCH figures; clamping behaviour for out-of-gamut input.

**Unit — `lib/theme.ts`:** a **property sweep** over a wide range of brand hexes × both presets ×
both schemes asserting the floors always hold. This sweep *is* the accessible-by-construction
guarantee; `tokens.test.ts` structurally cannot supply it (§1.1e). Plus:

- the identity case: `#2d6a4f` → `#2d6a4f` and `#4043e7` → `#4043e7`, exactly;
- extremes that shipped in the spike: pure yellow, magenta, neon cyan, black, white, mid grey;
- malformed input returns null rather than throwing.

**Unit — drift guard:** `PRESET_SURFACES` matches `styles/index.css` exactly (§3.4).

**Unit — `styles/tokens.test.ts`:** extended per §3.5.

**Playwright:** injects the same `<style>` string the server emits into a page that has `index.css`
loaded, then reads `getComputedStyle(document.documentElement).getPropertyValue('--sem-accent')`
under both emulated colour schemes. This tests the real cascade risk without requiring `brandColor`
to be set in the test dataset. A second case asserts the `warm` preset applies via `data-theme`.

---

## 5. Risks

- **The derivation is only as good as its floors.** WCAG ratios guarantee legibility, not taste. A
  lab can still pick a colour that is accessible and ugly. Accepted: the alternative is free-form
  token editing, which this whole approach exists to avoid.
- **`data-theme` is new surface area.** It is introduced here and consumed by 4D. Until then it has
  exactly one non-default value.
- **Widening `--sem-link` changes rendered prose** on a site that currently shows prose links in body
  colour. Visible with `brandColor` unset too, since `--sem-link` already has a default value.

---

## 6. Out of scope

Deferred to **4D**, deliberately:

- `viewport.themeColor` is hardcoded `#F8F8F8` in `app/layout.tsx` and will be marginally wrong under
  `warm` (`#faf8f4`). It moves to `generateViewport` in 4D.
- `app/manifest.ts`, `app/robots.ts`, CMS favicon, JSON-LD colour fields.
- Deleting `public/logo.svg` and the "HOLSINGLER" typo it carries into structured data via
  `lib/json-ld.ts` — 4B's explicit deferral.

Not in this programme: a user-facing theme toggle. Preset selection is a CMS decision, not a visitor
preference, and `prefers-color-scheme` continues to own light/dark.
