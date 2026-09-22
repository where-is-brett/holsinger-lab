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
  // The full responsive `padding-inline` triad lives in this one string
  // (not `md:px-gutter-md lg:px-gutter-lg` hardcoded separately in `main`'s
  // className below), so a caller's own `childrenStyles` is the *only*
  // utility touching `padding-left`/`padding-right` on `main` at every
  // breakpoint -- never a second, competing declaration a caller can't see
  // or override. Before this, a caller passing `childrenStyles="px-0"` to
  // opt out of Layout's gutter (as the redesign screens' own rails require
  // -- spec §4.3, "the screens own their rails; Layout's gutter would
  // double them") only ever cancelled the unprefixed default: the `md:`/
  // `lg:` rules stayed hardcoded in `main`'s own className and silently
  // re-applied from `md` up, because Tailwind's responsive utilities are
  // generated after the base layer and so win at equal specificity
  // regardless of each utility's position in the class string. That's
  // exactly the "two Tailwind utilities setting the same CSS property on
  // one element at the same breakpoint" trap the repo's own rule warns
  // about (constraints.md) -- caught here by Task 4's `/publications`
  // width-check e2e failing at exactly 1024px (`lg`'s breakpoint), where
  // the reasserted gutter left no room for the ledger grid's fixed columns.
  childrenStyles = 'px-gutter md:px-gutter-md lg:px-gutter-lg',
}: LayoutProps) {
  const { siteName, shortName } = resolveBranding(settings)

  // Phase 4B's uploaded logo still wins over the text wordmark when set.
  const logo = settings?.logo ? (
    <Logo logo={settings.logo} logoDark={settings.logoDark} shortName={shortName} />
  ) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <SiteChrome
        items={liveNavItems({
          showPublications: settings?.showPublications,
          showPeople: settings?.showPeople,
          showContactForm: settings?.showContactForm,
        })}
        wordmark={{ long: siteName, short: shortName }}
        logo={logo}
      />

      {/* The header is now in-flow and sticky at every width. `mt-20`
          keeps mobile content where it sat under the old 48px fixed bar
          plus mt-32 (128 - 48 = 80px); desktop was already in-flow, so
          md:mt-16 is unchanged. Step 2's screen rebuilds own this spacing
          from here on. */}
      <main className={`mt-20 flex-grow md:mt-16 ${childrenStyles}`}>
        {children}
      </main>

      <SiteFooter lines={footerLines(settings?.footer)} />
    </div>
  )
}
