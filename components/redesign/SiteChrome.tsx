'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { MobileHeader } from './MobileHeader'
import { currentNavId, type NavItem } from './navModel'
import { SiteNav } from './SiteNav'

export interface SiteChromeProps {
  items: readonly NavItem[]
  /** Already resolved by `resolveBranding`. */
  wordmark: { long: string; short: string }
  /** Pre-rendered on the server; a React element can cross the RSC boundary, a function cannot. */
  logo?: ReactNode
}

// The one client seam in the chrome: the current page comes from the URL
// (spec decision 6). One sticky header at every width (decision 4) -- the
// Publications sticky bar keys its `top` off --nav-height, which is this
// element's height by construction.
export function SiteChrome({ items, wordmark, logo }: SiteChromeProps) {
  const current = currentNavId(usePathname(), items)
  return (
    <div data-testid="site-header" className="sticky top-0 z-40 bg-surface">
      <div className="hidden md:block">
        <SiteNav items={items} current={current} wordmark={wordmark} logo={logo} />
      </div>
      <div className="md:hidden">
        <MobileHeader items={items} current={current} wordmark={wordmark.short} logo={logo} />
      </div>
    </div>
  )
}
