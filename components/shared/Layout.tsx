import { Footer } from 'components/global/Footer'
import { Navbar } from 'components/global/Navbar/Navbar'
import { resolveBranding } from 'lib/branding'
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
  childrenStyles = 'px-gutter',
}: LayoutProps) {
  const { shortName } = resolveBranding(settings)

  return (
    <div className={`flex min-h-screen flex-col bg-surface text-text`}>
      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications ?? true}
        showPeople={settings?.showPeople ?? true}
        showContactForm={settings?.showContactForm ?? true}
        logo={settings?.logo}
        logoDark={settings?.logoDark}
        shortName={shortName}
      />

      <main
        className={`mt-32 flex-grow md:mt-16 md:px-gutter-md lg:px-gutter-lg ${childrenStyles}`}
      >
        {children}
      </main>

      <Footer footer={settings?.footer} />
    </div>
  )
}
