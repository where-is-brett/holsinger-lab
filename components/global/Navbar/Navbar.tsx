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
  return (
    <>
      <MobileNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
      />
      <DesktopNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
      />
    </>
  )
}
