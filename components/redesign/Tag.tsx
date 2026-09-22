import type { MouseEvent, ReactNode } from 'react'

import { HAIRLINE, HIT_AREA, LABEL_BASE } from './tokens'

export interface TagProps {
  children: ReactNode
  href?: string
  onClick?: (e: MouseEvent) => void
  /**
   * Fix round 2: an informational tag whose text can't be predicted (e.g. a
   * CMS topic title) may be too wide, on its own, for a narrow mobile
   * column -- the default `whitespace-nowrap` chip has fixed geometry by
   * design (see below), so a long one would either force a page-wide
   * horizontal scroll or need a scrollable container of its own (which
   * trips axe's `scrollable-region-focusable`, since a read-only tag row
   * has nothing focusable inside it, and looks visually cut off on a
   * phone). `wrap` swaps `whitespace-nowrap` for `whitespace-normal
   * max-w-full` instead: the chip grows taller and wraps its own text
   * rather than staying single-line, which is the accessible, non-clipping
   * fallback for exactly that case. Off by default, so every other caller
   * (the fixed-geometry ledger/facet chips this component also serves)
   * keeps today's single-line behaviour unchanged.
   */
  wrap?: boolean
}

// Visual box: fixed geometry regardless of interactivity, so an interactive
// and an informational tag render at the same size. Padding/whitespace/
// colour match the vendored source (padding: "8px 13px", whiteSpace:
// "nowrap", color: var(--sem-text-muted)) -- the vendored source is the
// port's authority, even where it differs from LABEL's baked-in faint.
const BASE_COMMON = `${LABEL_BASE} text-text-muted ${HAIRLINE} inline-block px-[13px] py-2 leading-none`
// Exactly one of these two is ever composed into `BASE` below -- `wrap`
// picks a whole string, not a class to layer on top of the other, so
// `white-space` is never set by two utilities on the same element (the
// same technique Button.tsx and CopyCitation.tsx already use for their own
// per-state class swaps -- see tokens.ts's LABEL_BASE comment).
const NOWRAP = 'whitespace-nowrap'
const WRAP = 'whitespace-normal max-w-full'

// Interactive-only: HIT_AREA (tokens.ts) expands the hit area to the 44px
// accessibility floor without growing the visual box itself -- a 44px-tall
// chip would wreck the density of the publication ledger row these tags sit
// in, and would make interactive and informational tags of the same visual
// class render at different sizes.

export function Tag({ children, href, onClick, wrap = false }: TagProps) {
  const BASE = `${BASE_COMMON} ${wrap ? WRAP : NOWRAP}`
  if (href) {
    return (
      <a
        className={`${BASE} ${HIT_AREA} hover:text-link hover:border-link`}
        href={href}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }
  if (onClick) {
    return (
      <button
        className={`${BASE} ${HIT_AREA} hover:text-link hover:border-link`}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    )
  }
  return <span className={BASE}>{children}</span>
}
