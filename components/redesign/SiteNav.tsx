import Link from 'next/link'
import type { ReactNode } from 'react'

import type { NavId, NavItem } from './navModel'

export interface SiteNavProps {
  items: readonly NavItem[]
  current?: NavId
  /** Already resolved by `resolveBranding` -- never raw CMS input. */
  wordmark: { long: string; short: string }
  /** A pre-rendered <Logo>, passed only when `settings.logo` is set. */
  logo?: ReactNode
  /** Landmark name. The gallery renders several instances and needs distinct ones. */
  label?: string
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteNav.jsx,
// then wired to real routes (Phase 3 step 1). Server-renderable: no handlers.
//
// Height comes from --nav-height (the single authority for header height;
// see styles/nav-height.test.ts). No background of its own -- SiteChrome's
// sticky wrapper paints it. `px-8` is the vendored source's 2rem, kept
// verbatim (it matches none of the gutter tokens; the source's choice).
const HEADER =
  'flex h-(--nav-height) items-center justify-between gap-6 box-border border-b border-rule px-8'

// The wordmark may truncate but never wraps: a long CMS siteName clips with
// an ellipsis rather than growing the bar (spec decision 2). `min-w-0` lets
// the flex item shrink below its content width; the nav is `shrink-0`, so
// the links always win the space.
//
// `WORDMARK` deliberately omits `display` -- `truncate` needs a block box,
// but each span already carries its own `display` pair below (`block
// lg:hidden` / `hidden lg:block`). Folding a shared `block` into this base
// string would set `display` a second time on the same span at the same
// breakpoint (same-property rule); it happened to still work only because
// `.hidden` is generated after `.block`, which is exactly the ordering
// dependency the rule exists to avoid.
const WORDMARK_LINK = 'min-w-0'
const WORDMARK = 'truncate font-mono text-[12px] leading-none font-medium tracking-[0.1em] uppercase'

const NAV = 'flex shrink-0 gap-7 font-mono text-[12px] leading-none tracking-[0.08em] uppercase'

// Two fully-formed class strings, not one base plus a same-property
// override: the current item never underlines, even on hover (source
// components.css `.hl-navlink[aria-current="page"]:hover`).
const NAVLINK =
  'text-inherit transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) hover:text-link hover:underline underline-offset-[5px]'
const NAVLINK_CURRENT =
  'text-link no-underline transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease)'

export function SiteNav({ items, current, wordmark, logo, label = 'Primary' }: SiteNavProps) {
  return (
    <header data-testid="site-nav" className={HEADER}>
      {logo ? (
        <Link href="/" aria-label="Home" className="shrink-0">
          {logo}
        </Link>
      ) : (
        // shortName below lg, siteName from lg (spec decision 2, amended):
        // the full name does not fit beside the links at 768-1023px.
        <Link href="/" className={WORDMARK_LINK}>
          <span data-testid="site-wordmark-short" title={wordmark.short} className={`${WORDMARK} block lg:hidden`}>
            {wordmark.short}
          </span>
          <span data-testid="site-wordmark-long" title={wordmark.long} className={`${WORDMARK} hidden lg:block`}>
            {wordmark.long}
          </span>
        </Link>
      )}
      <nav aria-label={label} className={NAV}>
        {items.map((it) => {
          const isCurrent = current === it.id
          return (
            <Link
              key={it.id}
              href={it.href}
              aria-current={isCurrent ? 'page' : undefined}
              className={isCurrent ? NAVLINK_CURRENT : NAVLINK}
            >
              {it.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
