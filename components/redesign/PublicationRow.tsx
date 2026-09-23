import Link from 'next/link'

import { CopyCitation } from './CopyCitation'
import type { Publication } from './publicationModel'
import { HIT_AREA, META, PUBLICATION_GRID } from './tokens'

export interface PublicationRowProps {
  pub: Publication
  density?: 'comfortable' | 'compact'
  variant?: 'index' | 'home'
  /** stacked anatomy for <720px containers -- the grid must not squeeze */
  narrow?: boolean
  onOpen?: (pub: Publication) => void
  /** Real routes: when set, the title is a next/link to it (spec §4.1). */
  href?: string | null
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
//
// Grid only from `xl` (spec §4.1 / ruling in §7, moved from `lg` in Task 2
// fix round 1): the 4-column ledger needs ~700px of content box for its
// title track alone not to collide with the journal column -- `Section`'s
// own `lg` content column (a ~160px label column plus the page gutter,
// replacing the old rail) is only 728px total at 1024px, leaving as little
// as 100px for the title before that. `xl` (1280px) is comfortably past
// that squeeze point (measured: the collision clears by about 1090px).
// Below `xl` the container is a plain block (no `grid`/`flex` utility at
// all -- that's the initial value, so there is nothing to set and nothing
// that could collide with the `xl:` triad below).
const GRID = PUBLICATION_GRID
// The mobile "year — journal ref" kicker line, shared by every non-narrow
// variant below `xl`. Same anatomy as the `narrow` branch's kicker.
const KICKER = 'font-mono text-[10px] leading-[1.4] font-medium tracking-[0.06em] uppercase'

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

// Title renders as a real control only when there's somewhere for it to go:
// a `next/link` when `href` is set (real routes, Task 3/spec §4.1), else
// the gallery's `onOpen` button, else a plain `<span>`. Styled to read as
// text, not a control: no border, no background, zeroed padding (the
// button branch only -- `Link` has no button chrome to strip), left-aligned,
// and the shared `:focus-visible` ring (never `outline-none`) is left
// untouched so keyboard users still see it land.
//
// TITLE_HOVER and HIT_AREA are applied here, inside the `href`/`onOpen`
// branches only, rather than folded into each call site's `className` --
// that keeps the row-hover colour coupling and the 44px hit area from ever
// landing on the non-interactive `<span>` branch, where there is no control
// for either to describe.
function Title({
  pub,
  href,
  onOpen,
  className,
}: {
  pub: Publication
  href?: string | null
  onOpen?: (pub: Publication) => void
  className: string
}) {
  if (href) {
    return (
      <Link
        href={href}
        data-testid="pub-title"
        className={`${TITLE_HOVER} ${HIT_AREA} ${className} block`}
      >
        {pub.title}
      </Link>
    )
  }
  if (onOpen) {
    return (
      <button
        type="button"
        data-testid="pub-title"
        onClick={() => onOpen(pub)}
        className={`${TITLE_HOVER} ${HIT_AREA} ${className} block border-0 bg-transparent p-0 text-left`}
      >
        {pub.title}
      </button>
    )
  }
  return (
    <span data-testid="pub-title" className={`${className} block`}>
      {pub.title}
    </span>
  )
}

// Shared "DOI 10.xxx" / "URL example.org/..." identifier line. `fontSize` is
// a Tailwind arbitrary text size (matching the source's per-shape font
// shorthand), and `label` lets compact substitute `linkLabelShort` while the
// href always carries the full `linkHref`.
// No identifier markup at all when there's nothing on file (spec §4.1) --
// not even the "DOI "/"URL " label, which only ever accompanies a real link.
function Identifier({
  pub,
  fontSize,
  label,
}: {
  pub: Publication
  fontSize: string
  label: string
}) {
  if (pub.linkHref === '') return null
  return (
    <span className={`font-mono ${fontSize} leading-[1.5] break-all`}>
      <span className="text-text-faint">{pub.linkKind} </span>
      <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
        {label}
      </a>
    </span>
  )
}

// [type, ...topics] joined verbatim, empty segments dropped -- so an empty
// `type` never leaves a leading " · " (spec §4.1, requirement 4).
function tagLine(pub: Publication): string {
  return [pub.type, ...pub.topics].filter(Boolean).join(' · ')
}

export function PublicationRow({
  pub,
  density = 'comfortable',
  variant = 'index',
  narrow = false,
  onOpen,
  href,
}: PublicationRowProps) {
  if (narrow) {
    return (
      <div className="group border-t border-rule py-[13px]">
        <div className={KICKER}>
          <span className="text-accent">{pub.year}</span>
          <span className="text-text-faint">
            {' '}
            — {pub.journal} {pub.ref}
          </span>
        </div>
        <Title
          pub={pub}
          href={href}
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
        {pub.linkHref !== '' && (
          <div className="relative mt-1.5 truncate font-mono text-[9.5px] leading-[1.4]">
            <span className="text-text-faint">{pub.linkKind} </span>
            <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
              {pub.linkLabel}
            </a>
          </div>
        )}
      </div>
    )
  }

  // Below, the responsive stacked-to-grid anatomy shared by `home` and both
  // `index` densities (spec §4.1, Task 3 brief point 2): one DOM tree per
  // variant, container classes switch to the ledger grid at `xl` (`GRID`),
  // and every element sets `display` at most once per breakpoint --
  // unprefixed for its stacked-anatomy role, `xl:` for its ledger-cell role
  // -- so no same-property pair can ever collide. The title element is
  // never duplicated (only its href/onOpen wiring changes); every other
  // paired element (year, journal/meta) is duplicated intentionally, once
  // as its mobile kicker/inline role and once as its own ledger cell, each
  // hidden at the breakpoint it doesn't serve.

  if (variant === 'home') {
    return (
      <div className={`${ROW} items-baseline py-(--spacing-row)`}>
        <span className="hidden font-mono text-[13px] leading-[1.5] font-medium text-accent xl:block">
          {pub.year}
        </span>
        <div className={`${KICKER} xl:hidden`}>
          <span className="text-accent">{pub.year}</span>
          <span className="text-text-faint">
            {' '}
            — {pub.journal} {pub.ref}
          </span>
        </div>
        <Title
          pub={pub}
          href={href}
          onOpen={onOpen}
          className="mt-1.5 xl:mt-0 xl:pr-3 text-[17.5px] leading-[1.35] font-semibold tracking-[-0.005em] text-pretty"
        />
        <span className="hidden font-mono text-[12.5px] leading-[1.5] text-text-muted xl:block">
          {pub.journal} {pub.ref}
        </span>
        {/* `relative` (see the HIT_AREA comment in tokens.ts and the `narrow`
            branch's identical comment below) -- below `xl` this identifier
            sits directly under the title with nothing else between them, so
            it's the element most exposed to the title's overhanging 44px
            hit area. Promoting it to a positioned element makes it paint
            after (on top of) the title's pseudo in the overlap band,
            keeping the DOI/URL link tappable. `mt-1.5 xl:mt-0`: real
            vertical rhythm below `xl` (matching the narrow branch), reset
            to nothing once the grid takes over and column gap does the
            spacing instead. */}
        {pub.linkHref !== '' && (
          <div className="relative mt-1.5 xl:mt-0">
            <Identifier pub={pub} fontSize="text-[12px]" label={pub.linkLabel} />
          </div>
        )}
      </div>
    )
  }

  if (density === 'compact') {
    return (
      <div className={`${ROW} items-baseline py-[10px]`}>
        <span className="hidden font-mono text-[12px] leading-[1.5] font-medium text-accent xl:block">
          {pub.year}
        </span>
        <div className={`${KICKER} xl:hidden`}>
          <span className="text-accent">{pub.year}</span>
          <span className="text-text-faint">
            {' '}
            — {pub.journal} {pub.ref}
          </span>
        </div>
        <Title
          pub={pub}
          href={href}
          onOpen={onOpen}
          className="mt-1.5 xl:mt-0 xl:truncate xl:pr-3 text-[14.5px] leading-[1.5] font-semibold tracking-[-0.005em]"
        />
        <span className="hidden truncate font-mono text-[11.5px] leading-[1.6] text-text-muted xl:block">
          {pub.journal} · {pub.ref}
        </span>
        {/* `relative` + `mt-1.5 xl:mt-0`: same title-hit-area protection and
            stacked-rhythm reset as the `home` branch above -- this row is
            the identifier/CopyCitation block for `compact`. */}
        <span className="relative mt-1.5 flex items-baseline gap-2.5 whitespace-nowrap font-mono text-[11px] leading-[1.6] xl:mt-0">
          {pub.linkHref !== '' && (
            <span className="overflow-hidden text-ellipsis">
              <span className="text-text-faint">{pub.linkKind} </span>
              <a className={IDENTIFIER} href={pub.linkHref} data-identifier>
                {pub.linkLabelShort || pub.linkLabel}
              </a>
            </span>
          )}
          <CopyCitation cite={pub.cite} compact />
        </span>
      </div>
    )
  }

  return (
    <div className={`${ROW} items-start py-(--spacing-row)`}>
      <span className="hidden font-mono text-[13px] leading-[1.5] font-medium text-accent xl:block">
        {pub.year}
      </span>
      <div className={`${KICKER} xl:hidden`}>
        <span className="text-accent">{pub.year}</span>
        <span className="text-text-faint">
          {' '}
          — {pub.journal} {pub.ref}
        </span>
      </div>
      <div className="mt-1.5 flex flex-col gap-[7px] xl:mt-0 xl:pr-3">
        <Title
          pub={pub}
          href={href}
          onOpen={onOpen}
          className="text-[17.5px] leading-[1.35] font-semibold tracking-[-0.005em] text-pretty"
        />
        <div className="text-[13px] leading-[1.55] text-text-muted" data-testid="pub-authors">
          {pub.authorsPre}
          <strong className="font-semibold text-text">{pub.authorsPI}</strong>
          {pub.authorsPost}
        </div>
        {/* Task 3: sentence-case Archivo, not uppercase mono -- `tagLine`
            joins the publication's own `type` and CMS `topics` (constraints.md:
            "CMS text prints verbatim"), and this renders once per row, so
            keeping it upper-case blew the micro-label budget on
            /publications by itself (one violation per visible row). */}
        {tagLine(pub) !== '' && (
          <div className="text-[13px] leading-[1.6] font-medium text-text-faint">{tagLine(pub)}</div>
        )}
      </div>
      <div className={`hidden xl:block ${META}`}>
        {pub.journal}
        <br />
        {pub.ref}
      </div>
      {/* `relative` + `mt-1.5 xl:mt-0`: same title-hit-area protection and
          stacked-rhythm reset as the `home`/`compact` branches above -- this
          is the identifier/CopyCitation block for comfortable density. It
          isn't always the element directly under the title (the authors
          and tag lines usually sit between them), but the tag line is
          conditional and titles vary in height, so this stays defensive
          rather than relying on there always being a buffer. */}
      <div className="relative mt-1.5 flex flex-col items-start gap-2.5 xl:mt-0">
        <Identifier pub={pub} fontSize="text-[11.5px]" label={pub.linkLabel} />
        <CopyCitation cite={pub.cite} />
      </div>
    </div>
  )
}
