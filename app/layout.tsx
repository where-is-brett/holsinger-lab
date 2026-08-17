import 'styles/index.css'

import { PreviewBanner } from 'components/preview/PreviewBanner'
import { JsonLd } from 'components/shared/JsonLd'
import { resolveBranding } from 'lib/branding'
import { resolveIconUrl } from 'lib/icons'
import { buildOrganizationJsonLd } from 'lib/json-ld'
import { resolveBrandStyle } from 'lib/layout-branding'
import { sanityFetch, SanityLive } from 'lib/sanity.live'
import { settingsQuery } from 'lib/sanity.queries'
import { fetchSettingsSafely } from 'lib/settings'
import { siteUrl } from 'lib/site'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'
import { cache } from 'react'
import type { Image } from 'sanity'

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['500', '700'],
})

const serif = PT_Serif({
  variable: '--font-serif',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  weight: ['400', '700'],
})

const antarcticanMono = localFont({
  src: [
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-SemiBold.woff2',
      weight: '600',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Book.woff2',
      weight: 'normal',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Bold.woff2',
      weight: 'bold',
    },
  ],
  variable: '--font-antarctican-mono',
})

const arianaPro = localFont({
  src: [
    {
      path: '../fonts/ariana-pro/ArianaPro-Book.woff2',
      weight: '300',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Black.woff2',
      weight: '900',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Bold.woff2',
      weight: '700',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Regular.woff2',
      weight: '400',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Thin.woff2',
      weight: '100',
    },
  ],
  variable: '--font-ariana-pro',
})

export const revalidate = 60

/**
 * Cached per request, so `generateMetadata` and the component below share one
 * fetch. `stega: false` is required, not cosmetic: siteName reaches <title>,
 * Open Graph tags and JSON-LD, and stega encodes invisible characters into
 * strings during draft-mode sessions (Phase 2D's recorded lesson).
 */
const getSettings = cache(() =>
  fetchSettingsSafely(() => sanityFetch({ query: settingsQuery, stega: false }))
)

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const { siteName } = resolveBranding(settings)
  const icon = settings.icon as Image | null | undefined

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    icons: {
      icon: [
        {
          url: resolveIconUrl(icon, 32) ?? '/favicon/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png',
        },
        {
          url: resolveIconUrl(icon, 16) ?? '/favicon/favicon-16x16.png',
          sizes: '16x16',
          type: 'image/png',
        },
      ],
      // /favicon.ico is requested by browsers at a fixed path outside
      // Next's metadata system. Generating a real .ico requires ICO
      // container encoding, not worth the complexity here -- this stays
      // the static legacy fallback while the CMS-driven PNGs above (which
      // browsers prefer when both are present) do the real work.
      shortcut: '/favicon/favicon.ico',
      apple: {
        url: resolveIconUrl(icon, 180) ?? '/favicon/apple-touch-icon.png',
        sizes: '180x180',
      },
    },
    manifest: '/favicon/site.webmanifest',
  }
}

export const viewport: Viewport = { themeColor: '#F8F8F8' }

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()
  const { siteName } = resolveBranding(await getSettings())
  const { dataTheme, style: brandStyle } = resolveBrandStyle(await getSettings())

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      {brandStyle ? (
        <style
          // The value is built entirely from hex strings this codebase
          // generated -- buildBrandStyle emits nothing but `#rrggbb` into a
          // fixed template, and lib/theme.test.ts asserts it contains no
          // angle brackets. No CMS text reaches this string.
          dangerouslySetInnerHTML={{ __html: brandStyle }}
        />
      ) : null}
      <body className="bg-surface text-text">
        <JsonLd
          data={buildOrganizationJsonLd({
            name: siteName,
            url: siteUrl,
            logo: `${siteUrl}/logo.svg`,
          })}
        />
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  )
}
