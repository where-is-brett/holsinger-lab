'use client'
import { Dialog, DialogPanel } from '@headlessui/react'
import { resolveHref } from 'lib/sanity.links'
import Image from 'next/image'
import Link from 'next/link'
import logo from 'public/logo.svg'
import { useEffect, useState } from 'react'
import { MenuItem } from 'types'

const hamburgerLine = `h-[2px] w-6 my-[6px] bg-black transition ease transform duration-500`

const MobileNavBar = ({
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}: {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = () => {
    setIsMenuOpen((open) => !open)
  }

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <>
      <nav className="uppercase md:hidden">
        <div className="border-primary bg-background fixed bottom-auto left-0 right-0 top-0 z-50 h-16 border-y">
          {/*
            This logo link is a sibling of <Dialog>, so - like the hamburger
            button below - it goes `inert`+`aria-hidden` while the menu is
            open (Headless UI's useInertOthers makes everything outside the
            Dialog's own portaled tree inert while it's open). It keeps
            painting normally (`inert` doesn't affect paint) but is silently
            unclickable while open. The transparent Link inside <Dialog>'s
            tree below (see its comment, near the close button) is what
            actually receives the tap and navigates home while the menu is
            open, using the same click-passthrough mechanism as the
            hamburger/close button pair.
          */}
          <Link href="/">
            <Image
              src={logo}
              width={120}
              alt="logo"
              className="absolute left-4 my-4 h-[50%]"
            />
          </Link>

          {/*
            This button's visible icon is the only one the user ever sees,
            but while the menu is open it is `inert` (see the comment on the
            overlay button inside <Dialog> below) and purely decorative -
            the overlay button is what actually receives the click. Per the
            HTML spec, `inert` elements are excluded from pointer-event
            hit-testing, so a click that physically lands on this
            visually-on-top-but-inert button passes through it to whatever
            is painted directly beneath it at those screen coordinates - the
            transparent overlay button inside <Dialog>. Verified on Chromium
            and real WebKit (Mobile Safari device profile); untested on
            Firefox but expected to work, since this is standard,
            spec-mandated hit-testing behavior rather than a browser quirk.
            Regression-guarded by the geometry-click test "tapping the
            visible header icon..." in e2e/mobile-menu.spec.ts. Its
            `right-6` position and this header bar's `h-16` height must stay
            in sync with the overlay button's `right-6 top-0 h-16 w-9`, or
            the click-passthrough geometry breaks and the visible icon goes
            dead.
          */}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className="absolute right-6 border-0 bg-transparent py-4"
            onClick={handleMenuClick}
          >
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && 'translate-y-2 rotate-45'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen ? 'opacity-0' : 'group-hover:opacity-100'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && '-translate-y-2 -rotate-45'
              }`}
            />
          </button>
        </div>
        <Dialog
          open={isMenuOpen}
          onClose={closeMenu}
          transition
          unmount={false}
          aria-label="Mobile menu"
          className="data-closed:pointer-events-none fixed inset-0 z-20 md:hidden"
        >
          {/*
            Headless UI's Dialog makes everything outside its own portaled
            tree `inert`+`aria-hidden` while open (see useInertOthers) -
            including the always-visible header button and logo link above,
            since both live outside <Dialog>. Those elements therefore
            become unclickable/unfocusable/invisible-to-a11y-tree the
            moment the menu opens, even though they still visually render
            (inert doesn't affect paint, only interaction+a11y). Per the
            HTML spec, `inert` elements are excluded from pointer-event
            hit-testing, so a click that physically lands on the
            visually-on-top-but-inert header button passes through it to
            this button - the *real* close control while open: it's part
            of the Dialog's own tree (so it stays interactive and
            focus-trap/tab-order-participating), and it's positioned to
            exactly overlay the header button's hit area so the single
            visible "X" icon underneath remains the only thing the user
            perceives, while this transparent button is what actually
            receives the click/tap/keyboard activation. The logo link just
            below uses the identical pattern for the header logo. Verified
            on Chromium and real WebKit (Mobile Safari device profile);
            untested on Firefox but expected to work, since this is
            standard, spec-mandated hit-testing behavior rather than a
            browser quirk. Regression-guarded by the geometry-click test
            "tapping the visible header icon..." in
            e2e/mobile-menu.spec.ts.

            Geometry coupling: `right-6 top-0 h-16 w-9` must stay in sync
            with the header button's own `right-6` position and the header
            bar's `h-16` height (see the comment on that button above) -
            if either drifts, the visible icon and the actual clickable
            area fall out of alignment and the icon becomes dead to clicks.
            `z-30` (vs. the Dialog wrapper's `z-20`) is needed so this
            button sits above `DialogPanel` within the Dialog's own
            stacking context, since DialogPanel covers the full viewport.
          */}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label="Close menu"
            className="absolute right-6 top-0 z-30 h-16 w-9 border-0 bg-transparent"
            onClick={closeMenu}
          />
          {/*
            Same click-passthrough pattern as the close button above,
            applied to the header logo: the header logo <Link> is a
            sibling of <Dialog>, so it goes `inert` while the menu is
            open and is excluded from pointer-event hit-testing per the
            HTML spec. A click that physically lands on the
            visually-on-top-but-inert logo passes through it to this
            Link, which lives inside <Dialog>'s own tree and stays
            interactive, so tapping the visible logo while the menu is
            open genuinely navigates home (via `onClick={closeMenu}` plus
            Next's own <Link> navigation, mirroring how the menu links
            below close the menu on click).

            Geometry coupling: `left-4 top-0 h-16` must stay in sync with
            the header logo's own `left-4` position and the header bar's
            `h-16` height (see the comment on the logo above) - if either
            drifts, the visible logo and the actual clickable area fall
            out of alignment and the logo becomes dead to clicks. `z-30`
            is needed for the same reason as the close button above: it
            must sit above `DialogPanel` within the Dialog's own stacking
            context. Verified on Chromium and real WebKit (Mobile Safari
            device profile); untested on Firefox but expected to work,
            since this is standard, spec-mandated hit-testing behavior.
            Regression-guarded by the "tapping the visible logo..."
            geometry-click test in e2e/mobile-menu.spec.ts.
          */}
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Home"
            className="absolute left-4 top-0 z-30 h-16 w-[120px]"
          />
          <DialogPanel
            id="mobile-menu-panel"
            transition
            className="bg-background data-closed:translate-x-full data-enter:ease-out data-leave:ease-in fixed inset-0 flex
                      h-[100lvh] w-full flex-col items-center justify-center
                      gap-8 text-center text-2xl font-[400]
                      text-black transition duration-500"
          >
            {menuItems &&
              menuItems.map((menuItem: MenuItem, key: number) => {
                const href = resolveHref(menuItem?._type, menuItem?.slug)
                if (!href) {
                  return null
                }
                return (
                  <Link
                    key={key}
                    onClick={closeMenu}
                    className={`hover:text-gray-600`}
                    href={href}
                  >
                    {href === '/' ? 'Home' : menuItem.title}
                  </Link>
                )
              })}
            {showPublications && (
              <Link
                onClick={closeMenu}
                className="hover:text-gray-600"
                href={'/publications'}
              >
                Publications
              </Link>
            )}
            {showPeople && (
              <Link
                onClick={closeMenu}
                className="hover:text-gray-600"
                href={'/people'}
              >
                People
              </Link>
            )}
            {showContactForm && (
              <Link
                onClick={closeMenu}
                className="hover:text-gray-600"
                href={'/contact'}
              >
                Contact
              </Link>
            )}
          </DialogPanel>
        </Dialog>
      </nav>
    </>
  )
}

export default MobileNavBar
