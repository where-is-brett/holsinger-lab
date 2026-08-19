// One place that knows which Tailwind utilities express the design system's
// roles. Components import these instead of repeating utility strings, so a
// token change is a one-file edit.

/**
 * Mono caps label geometry, no colour. Callers add their own text colour --
 * split out because Tag, Button and CopyCitation each need a different,
 * state-dependent colour (muted / link / faint), and LABEL below bakes in
 * one fixed colour that only suits column heads and the footer.
 */
export const LABEL_BASE = 'font-mono text-label uppercase'
/** Mono caps label: column heads, footer. Faint by default. */
export const LABEL = `${LABEL_BASE} text-text-faint`
/** Mono metadata: journal refs, counts, identifiers. */
export const META = 'font-mono text-meta text-text-muted'
/** The system's only border treatment: 1px, square corners, no shadow. */
export const HAIRLINE = 'border border-rule-strong'
/**
 * The `[rail | content]` grid every page block shares. SectionRail and
 * PageTitle MUST use the same value or their rails misalign at the seam
 * between them -- the rail's right-edge rule is meant to read as one
 * continuous vertical line running down the page.
 *
 * Narrows to --spacing-rail-sm below `md`, widens to --spacing-rail from
 * `md` up. The vendored sources (SectionRail.jsx, PageTitle.jsx) both
 * hardcode `var(--spacing-rail) 1fr` at every viewport -- 88px is 23% of a
 * 390px mobile viewport, so neither source is mobile-aware. This
 * responsive narrowing is an addition on top of the port.
 */
export const RAIL_GRID = 'grid grid-cols-[var(--spacing-rail-sm)_1fr] md:grid-cols-[var(--spacing-rail)_1fr]'
/**
 * Press feedback. Paired with the motion tokens; reduced-motion neutralises it.
 *
 * Uses Tailwind 4's parenthesised custom-property shorthand, not the
 * bare-square-bracket form the brief originally suggested. Verified
 * empirically (see Task 4 report): the bracket spelling compiled to a
 * literal, invalid `transition-duration` declaration -- the raw property
 * name with no `var()` wrapper -- which browsers discard, so no duration
 * would ever apply. The parenthesised spelling used below correctly emits a
 * `var()`-wrapped value.
 *
 * (This comment deliberately avoids spelling out either utility class
 * verbatim: Tailwind's content scanner reads plain text, comments included,
 * so writing the broken form as a literal class name here would make it
 * reappear in the built stylesheet even though nothing renders it.)
 *
 * `transition-transform duration-(...) ease-(...)` used to live directly in
 * this constant. Moved out to a hand-written `.hl-press` class in
 * styles/index.css (Task 8a review fix): any consumer that paired this
 * constant with its own `transition-colors`/`transition-[...]` utility on
 * the same element silently lost one of the two transitions, because each
 * Tailwind transition utility overwrites the whole `transition-property`/
 * `-duration`/`-timing-function` triad rather than merging into it, and
 * only the utility generated later in the build's CSS wins. `.hl-press`
 * declares every animatable property (scale, transform, background, color,
 * border-color) in one `transition` shorthand, so it can never lose to a
 * sibling utility -- see that class's comment for the full story,
 * including why it lists `scale` (not just `transform`) for the press
 * itself.
 */
export const PRESS = 'hl-press active:scale-[0.97]'
/**
 * 44px accessibility floor without growing the element's own visual box.
 * `before:absolute before:inset-x-0 before:top-1/2 before:h-11
 * before:-translate-y-1/2` grows a pseudo-element to the 44px tap-target
 * minimum, centred on the element's own midline, while the element itself
 * keeps its small visual size -- a chip, tag, or ledger-row title rendered
 * at 44px tall would wreck the density these compact components exist for,
 * and would make interactive and informational variants of the same
 * visual class render at different sizes. `inset-x-0` bounds the expanded
 * hit area to the element's own width, so adjacent elements (tags in a
 * row, chips in a band) can't steal each other's taps. `relative` puts the
 * element in the right paint tier for the pseudo to attach to; nothing
 * here animates.
 *
 * Was defined identically in Tag.tsx, FacetChip.tsx, and
 * PublicationRow.tsx (final-review fix wave); hoisted here as the one
 * place that knows the mechanism, per this file's own header comment.
 */
export const HIT_AREA =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']"
