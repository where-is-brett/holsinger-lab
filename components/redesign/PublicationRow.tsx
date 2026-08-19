import { CopyCitation } from './CopyCitation'
import type { Publication } from './publicationRow'
import { HIT_AREA, META } from './tokens'

export interface PublicationRowProps {
  pub: Publication
  density?: 'comfortable' | 'compact'
  variant?: 'index' | 'home'
  /** stacked anatomy for <720px containers -- the grid must not squeeze */
  narrow?: boolean
  onOpen?: (pub: Publication) => void
}

// The load-bearing component of the direction. Four-column ledger anatomy on
// a normalized grid: 64px year | 1fr title-authors-tags | 230px journal |
// 250px link-cite, 28px column gap, 1px top hairline. Ported from
// docs/redesign-experiment/design-system/components/publications/PublicationRow.jsx,
// which is the authority for markup/values below.
//
// Grid columns and gap are concrete pixel literals in brackets, not custom
// property references, so there's no var()-wrapping trap here (see
// tokens.ts's PRESS comment for the trap itself).
const GRID = 'grid grid-cols-[64px_1fr_230px_250px] gap-x-[28px]'

// The row is the hover target, never a click target -- only the title (an
// optional <button>) is. `group` on the row pairs with `group-hover:` on the
// title so the two stay coupled without a row-level onClick, which would
// nest an interactive title inside a clickable region and trip axe in
// Task 9. Tailwind's `hover:`/`group-hover:` variants already emit
// `@media (hover: hover)`, which is the touch-doesn't-stick half of the
// source's `@media (hover: hover) and (pointer: fine)` guard on `.hl-row`
// and `.hl-row-title` in components.css -- Tailwind has no built-in variant
// for the `pointer: fine` half, so that part of the source's guard is not
// reproduced here.
const ROW = `group border-t border-rule transition-[background-color] duration-(--sem-motion-fast) ease-(--sem-ease) hover:bg-surface-raised ${GRID}`
const TITLE_HOVER =
  'group-hover:text-link transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease)'

// The identifier -- DOI or URL -- must print verbatim in every shape: never
// uppercased, never re-typed. `normal-case!` is Tailwind 4's trailing-bang
// form, emitting `text-transform: none !important` -- reproducing
// components.css's `.hl-identifier { text-transform: none !important; }`
// guard, which exists so an ambient uppercasing context (e.g. a mono-caps
// label line) can never mangle a case-sensitive identifier.
const IDENTIFIER = 'text-link normal-case! break-all'

// Title renders as a real control only when there's somewhere for it to go.
// `publication` has no `slug` field in the current Sanity schema (Phase 2
// adds it), so there is no per-publication URL to link to in Phase 1 --
// shipping the source's `href="#paper"` placeholder would be a visibly
// broken link and the same `href="#"` smell already flagged and fixed on
// Tag. Styled to read as text, not a control: no border, no background,
// zeroed padding, left-aligned, and the shared `:focus-visible` ring (never
// `outline-none`) is left untouched so keyboard users still see it land.
//
// TITLE_HOVER and HIT_AREA are applied here, inside the `onOpen` branch
// only, rather than folded into each call site's `className` -- that keeps
// the row-hover colour coupling and the 44px hit area from ever landing on
// the non-interactive `<span>` branch, where there is no control for either
// to describe.
function Title({
  pub,
  onOpen,
  className,
}: {
  pub: Publication
  onOpen?: (pub: Publication) => void
  className: string
}) {
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(pub)}
        className={`${TITLE_HOVER} ${HIT_AREA} ${className} block border-0 bg-transparent p-0 text-left`}
      >
        {pub.title}
      </button>
    )
  }
  return <span className={`${className} block`}>{pub.title}</span>
}

// Shared "DOI 10.xxx" / "URL example.org/..." identifier line. `fontSize` is
// a Tailwind arbitrary text size (matching the source's per-shape font
// shorthand), and `label` lets compact substitute `linkLabelShort` while the
// href always carries the full `linkHref`.
function Identifier({
  pub,
  fontSize,
  label,
}: {
  pub: Publication
  fontSize: string
  label: string
}) {
  return (
    <span className={`font-mono ${fontSize} leading-[1.5] break-all`}>
      <span className="text-text-faint">{pub.linkKind} </span>
      <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
        {label}
      </a>
    </span>
  )
}

export function PublicationRow({
  pub,
  density = 'comfortable',
  variant = 'index',
  narrow = false,
  onOpen,
}: PublicationRowProps) {
  if (narrow) {
    return (
      <div className="group border-t border-rule py-[13px]">
        <div className="font-mono text-[10px] leading-[1.4] font-medium tracking-[0.06em] uppercase">
          <span className="text-accent">{pub.year}</span>
          <span className="text-text-faint">
            {' '}
            — {pub.journal} {pub.ref}
          </span>
        </div>
        <Title
          pub={pub}
          onOpen={onOpen}
          className="mt-1.5 text-[14.5px] leading-[1.4] font-semibold text-pretty"
        />
        {/* `relative` (not just tidiness) -- see the HIT_AREA comment in tokens.ts.
            The title's expanded 44px hit area is centred on its own,
            shorter line box, so for a single-line title it overshoots into
            this element by a few px. A plain static sibling would sit
            *below* that absolutely-positioned pseudo-element in paint
            order regardless of DOM order, silently swallowing clicks meant
            for the identifier link in the overlap band. `relative` (with
            no offset, so no visual change) promotes this element into the
            same paint tier as the title's pseudo -- and being later in
            document order, it wins the overlap, so the real link stays
            clickable. */}
        <div className="relative mt-1.5 truncate font-mono text-[9.5px] leading-[1.4]">
          <span className="text-text-faint">{pub.linkKind} </span>
          <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
            {pub.linkLabel}
          </a>
        </div>
      </div>
    )
  }

  if (variant === 'home') {
    return (
      <div className={`${ROW} items-baseline py-(--spacing-row)`}>
        <span className="font-mono text-[13px] leading-[1.5] font-medium text-accent">
          {pub.year}
        </span>
        <Title
          pub={pub}
          onOpen={onOpen}
          className="pr-3 text-[17.5px] leading-[1.35] font-semibold tracking-[-0.005em] text-pretty"
        />
        <span className="font-mono text-[12.5px] leading-[1.5] text-text-muted">
          {pub.journal} {pub.ref}
        </span>
        <Identifier pub={pub} fontSize="text-[12px]" label={pub.linkLabel} />
      </div>
    )
  }

  if (density === 'compact') {
    return (
      <div className={`${ROW} items-baseline py-[10px]`}>
        <span className="font-mono text-[12px] leading-[1.5] font-medium text-accent">
          {pub.year}
        </span>
        <Title
          pub={pub}
          onOpen={onOpen}
          className="truncate pr-3 text-[14.5px] leading-[1.5] font-semibold tracking-[-0.005em]"
        />
        <span className="truncate font-mono text-[11.5px] leading-[1.6] text-text-muted">
          {pub.journal} · {pub.ref}
        </span>
        <span className="flex items-baseline gap-2.5 whitespace-nowrap font-mono text-[11px] leading-[1.6]">
          <span className="overflow-hidden text-ellipsis">
            <span className="text-text-faint">{pub.linkKind} </span>
            <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
              {pub.linkLabelShort || pub.linkLabel}
            </a>
          </span>
          <CopyCitation cite={pub.cite} compact />
        </span>
      </div>
    )
  }

  return (
    <div className={`${ROW} items-start py-(--spacing-row)`}>
      <span className="font-mono text-[13px] leading-[1.5] font-medium text-accent">
        {pub.year}
      </span>
      <div className="flex flex-col gap-[7px] pr-3">
        <Title
          pub={pub}
          onOpen={onOpen}
          className="text-[17.5px] leading-[1.35] font-semibold tracking-[-0.005em] text-pretty"
        />
        <div className="text-[13px] leading-[1.55] text-text-muted">
          {pub.authorsPre}
          <strong className="font-semibold text-text">{pub.authorsPI}</strong>
          {pub.authorsPost}
        </div>
        <div className="font-mono text-[10px] leading-[1.6] font-medium tracking-[0.1em] text-text-faint uppercase">
          {pub.type}
          {pub.topics && pub.topics.length ? ` · ${pub.topics.join(' · ')}` : ''}
        </div>
      </div>
      <div className={META}>
        {pub.journal}
        <br />
        {pub.ref}
      </div>
      <div className="flex flex-col items-start gap-2.5">
        <Identifier pub={pub} fontSize="text-[11.5px]" label={pub.linkLabel} />
        <CopyCitation cite={pub.cite} />
      </div>
    </div>
  )
}
