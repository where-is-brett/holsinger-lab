import 'styles/index.css'

import { siteName, siteUrl } from 'lib/site'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
import localFont from 'next/font/local'

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  icons: {
    icon: [
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/favicon/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      <body className="bg-background text-black dark:bg-black dark:text-white">
        {children}
      </body>
    </html>
  )
}
