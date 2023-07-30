'use client'
import { useEffect, useState } from 'react'
import { MenuItem } from 'types'

import DesktopNavBar from './DesktopNavBar'
import MobileNavBar from './MobileNavBar'

interface NavbarProps {
  menuItems?: MenuItem[]
  showPublications?: boolean
  showPeople?: boolean
  showContactForm?: boolean
}

export function Navbar({
  menuItems,
  showPublications = true,
  showPeople = true,
  showContactForm = true,
}: NavbarProps) {
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  useEffect(() => {
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

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return isSmallScreen ? (
    <MobileNavBar
      handleMenuClick={handleMenuClick}
      isMenuOpen={isMenuOpen}
      menuItems={menuItems}
      showPublications={showPublications}
      showPeople={showPeople}
      showContactForm={showContactForm}
    />
  ) : (
    <DesktopNavBar
      menuItems={menuItems}
      showPublications={showPublications}
      showPeople={showPeople}
      showContactForm={showContactForm}
    />
  )
}
