import Logo from 'components/global/Logo'
import { footerLines, liveNavItems } from 'components/redesign/navModel'
import { SiteChrome } from 'components/redesign/SiteChrome'
import { SiteFooter } from 'components/redesign/SiteFooter'
import { resolveBranding } from 'lib/branding'
import { fallbackSettings, type SettingsPayload } from 'types'

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
  const { siteName, shortName } = resolveBranding(settings)

  // Phase 4B's uploaded logo still wins over the text wordmark when set.
  const logo = settings?.logo ? (
    <Logo logo={settings.logo} logoDark={settings.logoDark} shortName={shortName} />
  ) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <SiteChrome
        items={liveNavItems()}
        wordmark={{ long: siteName, short: shortName }}
        logo={logo}
      />

      {/* The header is now in-flow and sticky at every width. `mt-20`
          keeps mobile content where it sat under the old 48px fixed bar
          plus mt-32 (128 - 48 = 80px); desktop was already in-flow, so
          md:mt-16 is unchanged. Step 2's screen rebuilds own this spacing
          from here on. */}
      <main className={`mt-20 flex-grow md:mt-16 md:px-gutter-md lg:px-gutter-lg ${childrenStyles}`}>
        {children}
      </main>

      <SiteFooter lines={footerLines(settings?.footer)} />
    </div>
  )
}
