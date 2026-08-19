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
 */
export const PRESS = 'active:scale-[0.97] transition-transform duration-(--sem-motion-press) ease-(--sem-ease-out)'
