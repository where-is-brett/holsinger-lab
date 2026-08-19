'use client'

import type { MouseEvent } from 'react'

export type NavId = 'home' | 'pubs' | 'research' | 'resources' | 'people' | 'lab'

export const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'pubs', label: 'Publications' },
  { id: 'research', label: 'Research' },
  { id: 'resources', label: 'Resources' },
  { id: 'people', label: 'People' },
  { id: 'lab', label: 'Lab' },
]

export interface SiteNavProps {
  current?: NavId
  items?: { id: string; label: string }[]
  onNavigate?: (id: string) => void
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteNav.jsx.
// 'use client': `onNavigate` attaches a click handler to the host <a>s.

// Task brief decision #6: this header sits outside Layout's content column
// as page chrome, so it owns its own horizontal padding rather than
// deferring to Layout's gutters -- `px-8` (2rem) matches the vendored
// source exactly. Note: 2rem matches none of --spacing-gutter (1.125rem),
// -md (3rem) or -lg (3.5rem) -- that inconsistency belongs to the source
// and is intentionally not "fixed" here.
//
// Not sticky in this direction -- the header scrolls away with the page,
// unlike FacetBand's sticky band. Height comes from --nav-height (the
// single authority for header height across the app; see styles/index.css
// and styles/nav-height.test.ts), never a hardcoded pixel value.
const HEADER =
  'flex h-(--nav-height) items-center justify-between gap-6 box-border border-b border-rule px-8'

const WORDMARK = 'font-mono text-[12px] leading-none font-medium tracking-[0.1em] uppercase'

const NAV = 'flex gap-7 font-mono text-[12px] leading-none tracking-[0.08em] uppercase'

// Two fully-formed class strings, not one base plus a same-property
// override -- see tokens.ts's PRESS comment for why that matters whenever
// two utilities could touch the same property. Here it's `text-decoration`:
// the current item never underlines, even on hover (matching
// components.css's `.hl-navlink[aria-current="page"]:hover { text-decoration:
// none; }`), so folding a shared `hover:underline` onto both variants and
// relying on a later `no-underline` to cancel it on the current item would
// depend on Tailwind's generation order rather than intent.
const NAVLINK = 'text-inherit transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) hover:text-link hover:underline underline-offset-[5px]'
const NAVLINK_CURRENT = 'text-link no-underline transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease)'

export function SiteNav({ current, items = NAV_ITEMS, onNavigate }: SiteNavProps) {
  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      e.preventDefault()
      onNavigate(id)
    }
  }
  return (
    <header className={HEADER}>
      <a href="#home" onClick={go('home')} className={WORDMARK}>
        Holsinger Lab — The University of Sydney
      </a>
      <nav className={NAV}>
        {items.map((it) => {
          const isCurrent = current === it.id
          return (
            <a
              key={it.id}
              href={'#' + it.id}
              onClick={go(it.id)}
              aria-current={isCurrent ? 'page' : undefined}
              className={isCurrent ? NAVLINK_CURRENT : NAVLINK}
            >
              {it.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
