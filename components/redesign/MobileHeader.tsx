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
// transparent overlays the old MobileNavBar carried (Phase 3 deleted it).

// Height from --nav-height, not the source's hardcoded 48 (styles/nav-height.test.ts).
const BAND =
  'flex h-(--nav-height) items-stretch justify-between box-border border-b border-rule px-(--spacing-gutter)'

// Task 3: sentence-case Archivo, not uppercase mono -- matches SiteNav.tsx's
// own identical fix (this is the mobile equivalent of the same wordmark).
// Not exercised by e2e/label-budget.spec.ts's 1440px check (this band is
// `md:hidden`), but the brief names "THE UNIVERSITY OF SYDNEY" explicitly
// as a kicker to convert, and this file renders that same string too (the
// open sheet's own footer line, below).
const WORDMARK = 'flex min-w-0 items-center font-sans text-[12px] leading-none font-medium'

// `w-16`: a FIXED width, not just the source's ~43px min-width floor. Open
// and closed render different labels ("Menu" vs "Close ✕"), and a
// content-sized button would then be two different widths -- which is
// exactly the 13px mismatch e2e/mobile-menu.spec.ts's geometry test caught
// (Task 4). A fixed width, comfortably over either label's natural width,
// keeps the in-panel Close's box identical to the outer Menu toggle's,
// which both clears the 44px tap-target floor and is the geometry decision
// 3 depends on. The band's full height already clears the target
// vertically (`items-stretch`).
// Task 3: sentence-case Archivo, not uppercase mono ("Menu"/"Close ✕" is a
// button label, not a data column head).
const TOGGLE =
  'flex w-16 shrink-0 items-center justify-center px-1 font-sans text-[12px] leading-none font-medium text-link'

// Task 3: sentence-case Archivo, not uppercase mono -- these are the sheet's
// own nav links, same fix as SiteNav.tsx's desktop `NAV`.
const SHEET_ROW =
  'flex min-h-14 items-center gap-4 box-border border-b border-rule px-(--spacing-gutter) font-sans text-[15px] leading-none font-medium'

const SHEET_NUMBER = 'w-[18px] font-mono text-[10px] leading-none text-text-faint'

export interface MobileBandProps {
  /** shortName, already resolved by `resolveBranding`. */
  wordmark: string
  logo?: ReactNode
  open: boolean
  onToggle?: () => void
  /** Called when the wordmark link is activated -- the open sheet closes itself. */
  onHome?: () => void
  /**
   * Headless UI 2.x honours `data-autofocus` on an element inside the
   * panel: passed only by the in-panel instance, so the dialog's initial
   * focus lands on Close rather than the wordmark link that precedes it in
   * DOM order.
   */
  autoFocus?: boolean
}

export function MobileBand({ wordmark, logo, open, onToggle, onHome, autoFocus }: MobileBandProps) {
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
        data-autofocus={autoFocus || undefined}
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
      {/* Task 3: sentence-case Archivo, not uppercase mono -- matches
          Home.tsx's IdentityBlock kicker, the brief's own named example. */}
      <div className="px-(--spacing-gutter) pt-4 pb-5 font-sans text-[13px] leading-[1.5] text-text-faint">
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
    // `<header>`, not a bare `<div>`: the closed band's wordmark link
    // otherwise sits outside any landmark, which axe's `region` rule flags
    // (found running e2e/axe.spec.ts at mobile viewports in Task 4).
    <header data-testid="mobile-header">
      <MobileBand wordmark={wordmark} logo={logo} open={open} onToggle={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={close}
        transition
        unmount={false}
        aria-label="Menu"
        // `fixed inset-0`, not `relative`: DialogPanel is itself `fixed
        // inset-0`, which is out of flow -- a merely `relative` root has no
        // in-flow content and collapses to zero height, which is a real
        // box, and a role="dialog" element with a zero-size box reads as
        // not visible (Playwright's actionability checks, some AT).
        className="fixed inset-0 z-50"
      >
        <DialogPanel
          id="mobile-menu-panel"
          transition
          className="fixed inset-0 overflow-y-auto bg-surface text-text transition-opacity duration-(--sem-motion-reveal) ease-(--sem-ease) data-closed:opacity-0"
        >
          <MobileBand wordmark={wordmark} logo={logo} open onToggle={close} onHome={close} autoFocus />
          <MobileNavRows items={items} current={current} onNavigate={close} />
        </DialogPanel>
      </Dialog>
    </header>
  )
}
