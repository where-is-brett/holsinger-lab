import 'styles/wix.css'

import { PreviewBanner } from 'components/preview/PreviewBanner'
import { SanityLive } from 'lib/sanity.live'
import { wixFetch } from 'lib/wix/fetch'
import { siteNameQuery } from 'lib/wix/queries'
import type { Metadata } from 'next'
import { Bodoni_Moda, Lato, Montserrat, Playfair_Display, Raleway } from 'next/font/google'
import { draftMode } from 'next/headers'
import { stegaClean } from 'next-sanity'
import { VisualEditing } from 'next-sanity/visual-editing'

const playfair = Playfair_Display({ variable: '--wf-playfair', subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'] })
const lato = Lato({ variable: '--wf-lato', subsets: ['latin'], weight: ['300', '700'], style: ['normal', 'italic'] })
const raleway = Raleway({ variable: '--wf-raleway', subsets: ['latin'], weight: ['400'] })
const bodoni = Bodoni_Moda({ variable: '--wf-bodoni', subsets: ['latin'], weight: ['400'], style: ['italic'] })
const montserrat = Montserrat({ variable: '--wf-montserrat', subsets: ['latin'], weight: ['400'] })

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const data = await wixFetch<string>(siteNameQuery, { stega: false })
  const siteName = stegaClean(data ?? 'Holsinger Lab')
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    // Preview deploy of a candidate design -- never index it.
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable} ${raleway.variable} ${bodoni.variable} ${montserrat.variable}`}>
      <body className="bg-white text-black">
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  )
}
