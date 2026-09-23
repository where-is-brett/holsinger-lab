// One place that knows which Tailwind utilities express the design system's
// roles. Components import these instead of repeating utility strings, so a
// token change is a one-file edit.

/**
 * Mono caps label geometry, no colour. Uppercase mono is for **data column
 * heads only** (spec §1.5) -- the publication ledger's Year/Title/Journal/
 * Link head row, carrying `data-testid="ledger-head"` so
 * `e2e/label-budget.spec.ts` can exclude it. Every other label uses
 * `CONTROL_BASE` (controls) or `MICRO_LABEL` (sentence-case labels) below.
 */
// Not exported: `LABEL` (below) is the only real consumer.
const LABEL_BASE = 'font-mono text-label uppercase'
/** Mono caps label: the publication ledger's column-head row only. */
export const LABEL = `${LABEL_BASE} text-text-faint`
/** Mono metadata: journal refs, counts, identifiers. */
export const META = 'font-mono text-meta text-text-muted'
/**
 * The non-uppercase geometry for a control (Tag, Button, CopyCitation,
 * FormField) whose text is caller-supplied or CMS content
 * (`Copy citation`, a topic title), not a shouted mono label. Same mono
 * family and size as `LABEL_BASE`, no `text-transform`, lighter tracking.
 * Colour is per-branch, not baked in.
 */
export const CONTROL_BASE = 'font-mono text-[11px] leading-none font-medium tracking-[0.02em]'
/**
 * The sentence-case Archivo geometry for a small kicker/meta-label that
 * isn't a data column head -- e.g. "Principal investigator", a role-group
 * heading, a research project's kicker line. Same 13px/500/Archivo
 * geometry `Section.tsx`'s own label uses, so it reads as the same visual
 * weight. `leading-[1.4]` (not `leading-none`) gives a wrapping label real
 * line spacing. Colour is `text-text-muted` by default; callers needing
 * the inverse (dark-surface) variant compose their own
 * `text-text-inverse-muted`.
 */
export const MICRO_LABEL = 'font-sans text-[0.8125rem] leading-[1.4] font-medium text-text-muted'
/** The system's only border treatment: 1px, square corners, no shadow. */
export const HAIRLINE = 'border border-rule-strong'
/**
 * `Section`'s structural signature: from `lg` (1024px), a `[label |
 * content]` grid with a narrow ~10rem label column, top-aligned, no
 * vertical rule between the two (spec §1.3). Below `lg`, a single column.
 *
 * `PageTitle` reuses this same grid, with an empty label cell, so its
 * `<h1>`/meta row lands in the same content column as every `Section`'s
 * own content below it. Hoisted here (not private to `Section.tsx`) so
 * both can share the exact same value -- two independently-typed copies
 * of a `10rem` column width can only be kept in sync by discipline.
 */
export const SECTION_GRID = 'grid grid-cols-1 gap-2 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:gap-y-0'
/**
 * The page's one asymmetric horizontal gutter, shared by `Section`,
 * `PageTitle` and `FacetBand` -- `md`, not `lg`, is this scheme's own
 * breakpoint, independent of `SECTION_GRID`'s `lg` column switch above.
 */
export const SECTION_GUTTER_X = 'px-(--spacing-gutter) md:pr-(--spacing-gutter-lg) md:pl-(--spacing-gutter-md)'
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
 * column gap, `xl` only (stacked below it). Home's column head,
 * PublicationRow's row grid and PublicationsIndex's column heads MUST use
 * the same value or the head row's cells stop lining up with the rows
 * underneath it -- hoisted here as the one shared constant.
 *
 * The title track is `minmax(0,1fr)`, not a bare `1fr`: a bare `1fr`
 * carries an implicit `min-width: auto` and refuses to shrink below its
 * widest unbroken word, which can push the row past the viewport. `xl`
 * (not `lg`) is where the ledger's own content column (`Section.tsx`'s
 * ~728px at 1024px) gives the title enough room that it doesn't collide
 * with the journal column beside it -- `e2e/publications-interactive.
 * spec.ts`'s and `e2e/home.spec.ts`'s per-row overflow checks prove this
 * directly, since a cell collision doesn't grow the document past the
 * viewport (the page-level overflow gate can't see it).
 */
export const PUBLICATION_GRID =
  'xl:grid xl:grid-cols-[64px_minmax(0,1fr)_230px_250px] xl:gap-x-[28px]'
