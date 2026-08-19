import type { MouseEvent, ReactNode } from 'react'

import { HAIRLINE, HIT_AREA, LABEL_BASE } from './tokens'

export interface TagProps {
  children: ReactNode
  href?: string
  onClick?: (e: MouseEvent) => void
}

// Visual box: fixed geometry regardless of interactivity, so an interactive
// and an informational tag render at the same size. Padding/whitespace/
// colour match the vendored source (padding: "8px 13px", whiteSpace:
// "nowrap", color: var(--sem-text-muted)) -- the vendored source is the
// port's authority, even where it differs from LABEL's baked-in faint.
const BASE = `${LABEL_BASE} text-text-muted ${HAIRLINE} inline-block whitespace-nowrap px-[13px] py-2 leading-none`

// Interactive-only: HIT_AREA (tokens.ts) expands the hit area to the 44px
// accessibility floor without growing the visual box itself -- a 44px-tall
// chip would wreck the density of the publication ledger row these tags sit
// in, and would make interactive and informational tags of the same visual
// class render at different sizes.

export function Tag({ children, href, onClick }: TagProps) {
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
