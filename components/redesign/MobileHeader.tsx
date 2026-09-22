'use client'

import { Dialog, DialogPanel } from '@headlessui/react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'

import type { NavId, NavItem } from './navModel'

// Ported from
// docs/redesign-experiment/design-system/components/navigation/MobileHeader.jsx,
// with the open state moved into a Headless UI Dialog for focus trap,
// Escape, scroll lock and `inert` (spec decision 3).
//
// The DialogPanel renders its own MobileBand at exactly the position of the
// one beneath it (both at the top of the viewport: the outer band sits in a
// `sticky top-0` header, the panel is `fixed inset-0`). While open, every
// control the user can see is inside the dialog's own tree, so nothing
// outside it ever needs to receive a click. That is what retires the two
// transparent overlays components/global/Navbar/MobileNavBar.tsx carried.

// Height from --nav-height, not the source's hardcoded 48 (styles/nav-height.test.ts).
const BAND =
  'flex h-(--nav-height) items-stretch justify-between box-border border-b border-rule px-(--spacing-gutter)'

const WORDMARK =
  'flex min-w-0 items-center font-mono text-[9.5px] leading-none font-medium tracking-[0.1em] uppercase'

// `min-w-11`: the source's ~43px-wide toggle sits under the 44px floor; the
// band's full height already clears it vertically (`items-stretch`).
const TOGGLE =
  'flex min-w-11 shrink-0 items-center justify-center px-1 font-mono text-[9.5px] leading-none font-medium tracking-[0.14em] uppercase text-link'

const SHEET_ROW =
  'flex min-h-14 items-center gap-4 box-border border-b border-rule px-(--spacing-gutter) font-mono text-[14px] leading-none font-medium tracking-[0.12em] uppercase'

const SHEET_NUMBER = 'w-[18px] font-mono text-[10px] leading-none text-text-faint'

export interface MobileBandProps {
  /** shortName, already resolved by `resolveBranding`. */
  wordmark: string
  logo?: ReactNode
  open: boolean
  onToggle?: () => void
  /** Called when the wordmark link is activated -- the open sheet closes itself. */
  onHome?: () => void
}

export function MobileBand({ wordmark, logo, open, onToggle, onHome }: MobileBandProps) {
  return (
    <div className={BAND}>
      <Link
        href="/"
        onClick={onHome}
        aria-label={logo ? 'Home' : undefined}
        data-testid="mobile-wordmark"
        className={WORDMARK}
      >
        {logo ?? <span className="truncate" title={wordmark}>{wordmark}</span>}
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className={TOGGLE}
      >
        {open ? (
          <>
            Close<span aria-hidden="true">&nbsp;✕</span>
          </>
        ) : (
          'Menu'
        )}
      </button>
    </div>
  )
}

export interface MobileNavRowsProps {
  items: readonly NavItem[]
  current?: NavId
  onNavigate?: () => void
  label?: string
}

export function MobileNavRows({ items, current, onNavigate, label = 'Primary' }: MobileNavRowsProps) {
  return (
    <>
      <nav aria-label={label} className="flex flex-col">
        {items.map((it, i) => {
          const isCurrent = current === it.id
          return (
            <Link
              key={it.id}
              href={it.href}
              onClick={onNavigate}
              aria-current={isCurrent ? 'page' : undefined}
              className={`${SHEET_ROW} ${isCurrent ? 'text-link' : 'text-inherit'}`}
            >
              <span className={SHEET_NUMBER}>{String(i + 1).padStart(2, '0')}</span>
              {it.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-(--spacing-gutter) pt-4 pb-5 font-mono text-[8.5px] leading-[1.5] tracking-[0.1em] uppercase text-text-faint">
        The University of Sydney
      </div>
    </>
  )
}

export interface MobileHeaderProps {
  items: readonly NavItem[]
  current?: NavId
  wordmark: string
  logo?: ReactNode
}

export function MobileHeader({ items, current, wordmark, logo }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Close when the viewport reaches `md` (48rem): the desktop bar takes
  // over there, and a dialog left open behind it would keep scroll locked.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div data-testid="mobile-header">
      <MobileBand wordmark={wordmark} logo={logo} open={open} onToggle={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={close}
        transition
        unmount={false}
        aria-label="Menu"
        className="relative z-50"
      >
        <DialogPanel
          id="mobile-menu-panel"
          transition
          className="fixed inset-0 overflow-y-auto bg-surface text-text transition-opacity duration-(--sem-motion-reveal) ease-(--sem-ease) data-closed:opacity-0"
        >
          <MobileBand wordmark={wordmark} logo={logo} open onToggle={close} onHome={close} />
          <MobileNavRows items={items} current={current} onNavigate={close} />
        </DialogPanel>
      </Dialog>
    </div>
  )
}
