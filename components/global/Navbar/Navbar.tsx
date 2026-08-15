import type { LogoImageSource } from 'lib/logo'
import { MenuItem } from 'types'

import DesktopNavBar from './DesktopNavBar'
import MobileNavBar from './MobileNavBar'

interface NavbarProps {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
  logo?: LogoImageSource | null
  logoDark?: LogoImageSource | null
  shortName: string
}

export function Navbar({
  menuItems,
  showPublications = true,
  showPeople = true,
  showContactForm = true,
  logo,
  logoDark,
  shortName,
}: NavbarProps) {
  return (
    <>
      <MobileNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
        logo={logo}
        logoDark={logoDark}
        shortName={shortName}
      />
      <DesktopNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
        logo={logo}
        logoDark={logoDark}
        shortName={shortName}
      />
    </>
  )
}
