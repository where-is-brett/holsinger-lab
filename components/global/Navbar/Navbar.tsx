'use client'
import { useEffect, useState } from 'react'
import { MenuItem } from 'types'

import DesktopNavBar from './DesktopNavBar'
import MobileNavBar from './MobileNavBar'

interface NavbarProps {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
}

export function Navbar({
  menuItems,
  showPublications = true,
  showPeople = true,
  showContactForm = true,
}: NavbarProps) {

  const [isBrowser, setIsBrowser] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    // Check if client side
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defers nav rendering until after mount to avoid SSR/hydration mismatch on window.innerWidth; pre-existing pattern, out of scope to redesign here
    setIsBrowser(true)
    // Monitor window size
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768)
      // Close menu when entering medium viewport
      window.innerWidth >= 768 && setIsMenuOpen(false)
    }
    handleResize() // Check initial screen size
    window.addEventListener('resize', handleResize) // Listen for resize events

    return () => {
      // Clean up event listeners
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      {isBrowser && (
        <>
          {isSmallScreen ?
            <MobileNavBar
              handleMenuClick={handleMenuClick}
              isMenuOpen={isMenuOpen}
              menuItems={menuItems}
              showPublications={showPublications}
              showPeople={showPeople}
              showContactForm={showContactForm}
            />
            :
            <DesktopNavBar
              menuItems={menuItems}
              showPublications={showPublications}
              showPeople={showPeople}
              showContactForm={showContactForm}
            />
          }
        </>
      )}
    </>
  )
}
