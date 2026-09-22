'use client'
import { Dialog, DialogPanel } from '@headlessui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { NAV } from './nav'

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  // Close on navigation. Adjusting state during render (rather than in a
  // useEffect keyed on pathname) avoids the extra render pass that a
  // synchronous setState-in-effect would cause -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }
  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && setOpen(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex size-[44px] flex-col items-center justify-center gap-[5px]"
      >
        <span className="h-[3px] w-[26px] bg-black" />
        <span className="h-[3px] w-[26px] bg-black" />
        <span className="h-[3px] w-[26px] bg-black" />
      </button>
      {/* The Dialog element itself carries role="dialog" -- Playwright's
          toBeVisible() (and any a11y tooling) checks *its* box, so fixed
          positioning, full-viewport sizing and the full-screen `bg-menu`
          fill must live here, not only on DialogPanel. A `relative` wrapper
          with only a `fixed` child has no box of its own and reads as
          hidden. */}
      <Dialog open={open} onClose={setOpen} className="fixed inset-0 z-50 bg-menu md:hidden">
        <DialogPanel className="size-full overflow-y-auto">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-[20px] top-[40px] flex size-[44px] items-center justify-center text-[28px] leading-none"
          >
            ×
          </button>
          <ul className="mx-auto mt-[110px] w-[180px]">
            {NAV.map(({ label, href }, i) => (
              <li key={href} className={i < NAV.length - 1 ? 'border-b border-black/60' : ''}>
                <Link
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={`flex h-[42px] items-center justify-center font-menu text-[16px]/[22.4px] tracking-[0.1em] ${pathname === href ? 'text-black/60' : 'text-black'}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </DialogPanel>
      </Dialog>
    </>
  )
}
