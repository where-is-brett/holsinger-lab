import type { ReactNode } from 'react'

import { STRIPE_BG } from './tokens'

export interface ResourceBlockMeta {
  label: string
  value: string
  href?: string
}

export interface ResourceBlockProps {
  title: string
  meta?: ResourceBlockMeta[]
  figureLabel?: string
  /**
   * An optional body rendered below the meta list -- Task 1's summary
   * paragraph plus `howToObtain` portable text. Purely additive: omitting it
   * reproduces this component's pre-Task-1 markup exactly.
   */
  children?: ReactNode
}

// Ported from
// docs/redesign-experiment/design-system/components/content/ResourceBlock.jsx.
// Purely presentational, no state or handlers -- no 'use client'.

// Meta values print VERBATIM -- a DOI is a case-sensitive identifier.
// Task 3 (spec §1.5): labels are sentence-case definition terms now, not
// uppercased by style -- `Kind`/`Source`/`DOI` are real `<dt>`s (a
// definition-list pairing reads better to assistive tech than an
// unstructured `<span>` beside a value anyway), each carrying its
// resourceModel.ts-supplied sentence-case text verbatim, never forced
// upper-case by CSS. `normal-case!` is Tailwind 4's trailing-bang form,
// emitting `text-transform: none !important` -- reproducing
// components.css's `.hl-identifier` guard (same technique as
// PublicationRow.tsx's IDENTIFIER constant) so an ambient uppercasing
// context can never mangle an identifier.
//
// Fix round 1: a realistic DOI (e.g.
// "10.1016/j.neurobiolaging.2023.04.012", 38 characters, no internal
// spaces) is wider on its own than the ~246px/32-mono-character content
// column at 320px -- normal word-wrapping only breaks at spaces, so without
// a hard break this single token pushed the whole page into horizontal
// scroll. `break-all` (`word-break: break-all`) is the same fix
// PublicationRow.tsx's own IDENTIFIER constant already applies, and is a
// different CSS property than `normal-case!`'s `text-transform`, so this is
// additive, not a same-property collision (constraints.md).
const IDENTIFIER = 'normal-case! break-all'

// `STRIPE_BG` (task brief decision #2: a static generated background is
// legitimate as an inline style) now lives in tokens.ts (PR C Task 3 fix
// round 1) -- see that file's own comment.

export function ResourceBlock({ title, meta = [], figureLabel, children }: ResourceBlockProps) {
  // Fix round 1: the two-track grid (a 1fr text column plus a fixed
  // 340px-wide figure track) was unconditional and unprefixed, so it
  // reserved the figure track (and squeezed the text into whatever was
  // left) at every width, including mobile, even when there is no
  // `figureLabel` to put in it. Now: a plain block at every width when
  // there's no figure (a single column, since there's nothing to put in a
  // second one), and the two-track grid only `lg:` and only when
  // `figureLabel` is set. Below `lg`, with a `figureLabel`, the figure
  // block below still renders -- it isn't gated by breakpoint, only by
  // whether `figureLabel` is truthy -- it just stacks under the text block
  // instead of sitting beside it (fix round 2: given its own `mt-8 lg:mt-0`
  // below, so the two blocks don't touch when stacked). Each of `display`
  // and `grid-template-columns` is set by at most one class here (this
  // ternary picks one string or the other, never both), so there's no
  // same-property collision at any breakpoint.
  const twoColumn = Boolean(figureLabel)
  return (
    <div
      data-testid="resource-block"
      className={
        twoColumn ? 'lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-x-(--spacing-gutter-lg)' : ''
      }
    >
      <div>
        {/* `text-heading` carries its own line-height/letter-spacing
            companions from styles/index.css's `@theme inline` block -- left
            unoverridden here so both apply, matching the source's explicit
            `lineHeight`/`letterSpacing` var references. */}
        {/* Fix round 1: same mechanism as PublicationPage.tsx's own `<h1>`
            (its own fix-round-1 comment) -- a single long unbreakable word
            in `title` can be wider than this column at 320px, and
            `break-words` (`overflow-wrap: break-word`) is a different
            property than anything else already set here, so it's additive.
            Task 1 fix round 1: `hyphens-auto` joins it (not replaces it) --
            see PageTitle.tsx's note on why `break-words` stays as a
            fallback rather than being removed.
            Task 2 fix round 2 (controller ruling): a real `<h2>`, not a
            `<div>` -- `Resources.tsx` went back to one `Section` per
            resource with a `<p>` kind label (not an `<h2>`, so two
            resources sharing a kind can't produce duplicate headings), so
            this title is now the only heading each resource section has.
            `ResourceBlock`'s other two call sites (`Home.tsx`'s single
            Resources block, `PublicationPage.tsx`'s Resource block) both
            already wrap this in a `Section` whose own label is an `<h2>`
            -- a second, sibling `<h2>` here doesn't skip or duplicate a
            level either way. Same visual style as before (this class
            string is unchanged); Preflight already zeroes `h2`'s default
            margin, so no layout shift. */}
        <h2
          data-testid="resource-block-title"
          className="max-w-[640px] text-heading font-semibold break-words hyphens-auto"
        >
          {title}
        </h2>
        <dl className="mt-[26px] flex flex-col gap-2.5 font-mono text-[12.5px] leading-[1.5]">
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="inline-block min-w-16 text-text-faint">{m.label}</dt>
              <dd className="inline">
                {m.href ? (
                  <a className={`text-link ${IDENTIFIER}`} href={m.href} data-identifier>
                    {m.value}
                  </a>
                ) : (
                  <span className={IDENTIFIER}>{m.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {children && <div className="mt-6">{children}</div>}
      </div>
      {figureLabel && (
        <div
          className="mt-8 box-border flex h-[200px] items-center justify-center border border-rule px-5 lg:mt-0"
          style={{ backgroundImage: STRIPE_BG }}
        >
          <span className="text-center font-mono text-[11px] leading-[1.6] text-text-faint">
            {figureLabel}
          </span>
        </div>
      )}
    </div>
  )
}
