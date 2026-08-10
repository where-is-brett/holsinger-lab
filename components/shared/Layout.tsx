import { Footer } from 'components/global/Footer'
import { Navbar } from 'components/global/Navbar/Navbar'
import { fallbackSettings } from 'types'
import { SettingsPayload } from 'types'

export interface LayoutProps {
  children: React.ReactNode
  settings: SettingsPayload | undefined
  childrenStyles?: string
}

export default function Layout({
  children,
  settings = fallbackSettings,
  childrenStyles = 'px-6',
}: LayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-background text-black`}>
      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications ?? true}
        showPeople={settings?.showPeople ?? true}
        showContactForm={settings?.showContactForm ?? true}
      />

      <div
        className={`mt-32 flex-grow md:mt-16 md:px-16 lg:px-32 ${childrenStyles}`}
      >
        {children}
      </div>

      <Footer footer={settings?.footer} />
    </div>
  )
}
