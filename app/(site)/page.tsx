import { AboutThemes } from 'components/wix/AboutThemes'
import { ContactBlock } from 'components/wix/ContactBlock'
import { Hero } from 'components/wix/Hero'
import { NewsHighlights } from 'components/wix/NewsHighlights'
import { wixFetch } from 'lib/wix/fetch'
import { homeQuery } from 'lib/wix/queries'
import type { HomeData } from 'lib/wix/types'

export const revalidate = 60

export default async function Home() {
  const home = (await wixFetch<HomeData>(homeQuery)) ?? { copy: null, news: [], contact: null }
  return (
    <>
      <Hero hero={home.copy?.hero ?? null} />
      <AboutThemes about={home.copy?.about ?? null} />
      <NewsHighlights news={home.news ?? []} />
      <ContactBlock contact={home.contact} />
    </>
  )
}
