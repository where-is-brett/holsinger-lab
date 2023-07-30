import 'styles/index.css'

import { AppProps } from 'next/app'
import { IBM_Plex_Mono, Inter, PT_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import { lazy } from 'react'

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['500', '700'],
})

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['500', '700', '800'],
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
    // {
    //   path: '../fonts/ariana-pro/ArianaPro-Light.woff2',
    //   weight: '300',
    // },
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

const PreviewProvider = lazy(() => import('components/preview/PreviewProvider'))

export default function App({ Component, pageProps }: AppProps) {
  const { preview, token } = pageProps
  return (
    <>
      <style jsx global>
        {`
          :root {
            --font-mono: ${mono.style.fontFamily};
            --font-sans: ${antarcticanMono.style.fontFamily};
            --font-serif: ${serif.style.fontFamily};
            --font-antarctican-mono: ${antarcticanMono.style.fontFamily};
            --font-ariana-pro: ${arianaPro.style.fontFamily};
          }
        `}
      </style>

      {preview ? (
        <PreviewProvider token={token}>
          <Component {...pageProps} />
        </PreviewProvider>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  )
}
