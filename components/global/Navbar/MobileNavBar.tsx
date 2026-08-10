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
        <div className="fixed bottom-auto left-0 right-0 top-0 z-50 h-16 border-y border-primary bg-background">
          <Link href="/">
            <Image
              src={logo}
              width={120}
              alt="logo"
              className="absolute left-4 my-4 h-[50%]"
            />
          </Link>

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
          className="fixed inset-0 z-20"
        >
          {/*
            Headless UI's Dialog makes everything outside its own portaled
            tree `inert`+`aria-hidden` while open (see useInertOthers) -
            including the always-visible header button above, since that
            button lives outside <Dialog>. That header button therefore
            becomes unclickable/unfocusable/invisible-to-a11y-tree the
            moment the menu opens, even though it still visually renders
            (inert doesn't affect paint, only interaction+a11y). This
            second button is the *real* close control while open: it's
            part of the Dialog's own tree (so it stays interactive and
            focus-trap/tab-order-participating), and it's positioned to
            exactly overlay the header button's hit area so the single
            visible "X" icon underneath remains the only thing the user
            perceives, while this transparent button is what actually
            receives the click/tap/keyboard activation.
          */}
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label="Close menu"
            className="absolute right-6 top-0 z-30 h-16 w-9 border-0 bg-transparent"
            onClick={closeMenu}
          />
          <DialogPanel
            id="mobile-menu-panel"
            transition
            className="fixed inset-0 flex h-[100lvh] w-full flex-col items-center
                      justify-center gap-8 bg-background text-center text-2xl
                      font-[400] text-black transition duration-500
                      data-closed:translate-x-full data-enter:ease-out data-leave:ease-in"
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
              <Link onClick={closeMenu} className="hover:text-gray-600" href={'/publications'}>
                Publications
              </Link>
            )}
            {showPeople && (
              <Link onClick={closeMenu} className="hover:text-gray-600" href={'/people'}>
                People
              </Link>
            )}
            {showContactForm && (
              <Link onClick={closeMenu} className="hover:text-gray-600" href={'/contact'}>
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
