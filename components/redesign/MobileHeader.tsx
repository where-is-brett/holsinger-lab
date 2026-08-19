'use client'

import type { MouseEvent } from 'react'

import { NAV_ITEMS } from './SiteNav'

export interface MobileHeaderProps {
  open?: boolean
  onToggle?: () => void
  current?: string
  items?: { id: string; label: string }[]
  onNavigate?: (id: string) => void
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/MobileHeader.jsx.
// 'use client': `onToggle`/`onNavigate` attach click handlers to host
// elements, and `open` drives a conditional render.

// Task brief decision #3: height comes from --nav-height, not the source's
// hardcoded 48 -- --nav-height happens to equal 48px today, but
// components/global/Navbar/MobileNavBar.tsx already reads the same token
// for the same purpose, and styles/nav-height.test.ts exists specifically
// to stop the header height desyncing from the sticky offsets that key off
// it. Hardcoding 48 here would reintroduce that drift risk.
const BAND =
  'flex items-stretch justify-between h-(--nav-height) box-border border-b border-rule px-(--spacing-gutter)'

const WORDMARK =
  'self-center font-mono text-[9.5px] leading-none font-medium tracking-[0.1em] uppercase'

// Task brief decision #4: the source's `padding: 0 4px` around ~9.5px mono
// text renders roughly 43px wide -- just under the 44px accessibility
// floor. Height already clears it (the button stretches to fill BAND's
// full --nav-height row via `items-stretch`); `min-w-11` (44px) adds the
// missing width floor without changing the row's height contract.
const TOGGLE = 'flex min-w-11 items-center justify-center px-1 font-mono text-[9.5px] leading-none font-medium tracking-[0.14em] text-link'

const SHEET_ROW =
  'flex min-h-14 items-center gap-4 box-border border-b border-rule px-(--spacing-gutter) font-mono text-[14px] leading-none font-medium tracking-[0.12em] uppercase'

const SHEET_NUMBER = 'w-[18px] font-mono text-[10px] leading-none text-text-faint'

export function MobileHeader({
  open = false,
  onToggle,
  current,
  items = NAV_ITEMS,
  onNavigate,
}: MobileHeaderProps) {
  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      e.preventDefault()
      onNavigate(id)
    }
  }
  return (
    <div>
      <div className={BAND}>
        <span className={WORDMARK}>Holsinger Lab — USYD</span>
        <button type="button" onClick={onToggle} aria-expanded={open} className={TOGGLE}>
          {open ? 'CLOSE ✕' : 'MENU'}
        </button>
      </div>
      {open && (
        <div>
          <nav className="flex flex-col">
            {items.map((it, i) => {
              const isCurrent = current === it.id
              return (
                <a
                  key={it.id}
                  href={'#' + it.id}
                  onClick={go(it.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`${SHEET_ROW} ${isCurrent ? 'text-link' : 'text-inherit'}`}
                >
                  <span className={SHEET_NUMBER}>{String(i + 1).padStart(2, '0')}</span>
                  {it.label}
                </a>
              )
            })}
          </nav>
          <div className="px-(--spacing-gutter) pt-4 pb-5 font-mono text-[8.5px] leading-[1.5] tracking-[0.1em] uppercase text-text-faint">
            The University of Sydney
          </div>
        </div>
      )}
    </div>
  )
}
