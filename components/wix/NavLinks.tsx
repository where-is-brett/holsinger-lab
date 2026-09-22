'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NAV } from './nav'

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav data-wix="nav" aria-label="Main" className="mt-[6px] flex justify-center">
      {NAV.map(({ label, href }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`px-[12px] font-raleway text-[14px]/[25.06px] ${active ? 'text-nav-active' : 'text-black'} hover:opacity-70`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
