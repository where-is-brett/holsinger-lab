import { Footer } from 'components/global/Footer'
import { Navbar } from 'components/global/Navbar/Navbar'
import PreviewNavbar from 'components/global/PreviewNavbar'
import { PreviewBanner } from 'components/preview/PreviewBanner'
import { SettingsPayload } from 'types'

const fallbackSettings: SettingsPayload = {
  menuItems: [],
  showPublications: false,
  showPeople: false,
  showContactForm: false,
  footer: [],
}

export interface LayoutProps {
  children: React.ReactNode
  settings: SettingsPayload | undefined
  preview?: boolean
  loading?: boolean
  childrenStyles?: string
}

export default function Layout({
  children,
  settings = fallbackSettings,
  preview,
  loading,
  childrenStyles = "px-6",
}: LayoutProps) {
  return (
    <div className={`flex flex-col bg-background text-black min-h-screen`}>
      
      {preview && <PreviewBanner loading={loading} />}

      {preview ? (
        <PreviewNavbar settings={settings} />
      ) : (
        <Navbar
          menuItems={settings?.menuItems}
          showPublications={settings?.showPublications}
          showPeople={settings?.showPeople}
          showContactForm={settings?.showContactForm}
        />
      )}

      <div className={`mt-32 md:mt-16 flex-grow md:px-16 lg:px-32 ${childrenStyles}`}>{children}</div>

      <Footer footer={settings?.footer} />

    </div>
  )
}
