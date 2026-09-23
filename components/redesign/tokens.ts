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
/**
 * The system's one "no portrait on file" background: a faint diagonal
 * stripe, `color-mix`ed against `--sem-text` so it works unchanged in both
 * themes. A static generated background is legitimate as an inline style
 * (Tailwind arbitrary values are fragile with nested parens and commas) --
 * was defined identically in PersonCard.tsx's `PortraitFrame` fallback,
 * ResourceBlock.tsx's figure placeholder, and Home.tsx's `PiPortrait64`
 * fallback (PR C Task 3 fix round 1); hoisted here as the one place that
 * knows the value, per this file's own header comment. Consumers apply it
 * via `style={{ backgroundImage: STRIPE_BG }}`, not a class -- see any of
 * the three call sites above.
 */
export const STRIPE_BG =
  'repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)'
/**
 * The publication ledger's 4-column `[year | title | journal | link-cite]`
 * grid track: 64px year, fluid title, 230px journal, 250px link-cite, 28px
 * column gap, `lg` only. Home's column head, PublicationRow's row grid and
 * PublicationsIndex's column heads MUST use the same value or the head row's
 * cells stop lining up with the rows underneath it -- same "one shared
 * constant" reasoning as every other cross-component layout value in this
 * file. Was spelled out identically in Home.tsx, PublicationRow.tsx
 * and PublicationsIndex.tsx (final-review fix wave); hoisted here as the one
 * place that knows the track, per this file's own header comment.
 *
 * Task 2 fix: the title track was a bare `1fr`, which carries an implicit
 * `min-width: auto` -- it refuses to shrink below its widest unbroken
 * child's min-content width, the same blowout Section.tsx's own content
 * column, PageTitle.tsx's `<h1>` row and FacetBand.tsx's row grid all guard
 * against. This stayed invisible while every row sat in a page column wide
 * enough to give the title's longest word room to spare; Section.tsx's own
 * narrower ~728px `lg` content column (a real ~160px label column plus a
 * page gutter, replacing the old rail's effectively ungutted 88px) was
 * narrow enough at exactly 1024px to expose it on a live long-title
 * publication row (`e2e/home.spec.ts`'s "no horizontal overflow at
 * 1024px"). `minmax(0,1fr)` sets the track's own minimum directly, so the
 * title (already `text-pretty`, wrapping at spaces) shrinks to fit instead
 * of forcing the whole row past the viewport.
 */
export const PUBLICATION_GRID =
  'lg:grid lg:grid-cols-[64px_minmax(0,1fr)_230px_250px] lg:gap-x-[28px]'
