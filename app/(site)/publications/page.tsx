import { PageStrip } from 'components/wix/PageStrip'
import { PublicationEntry } from 'components/wix/PublicationEntry'
import { PublicationsDownloadAll } from 'components/wix/PublicationsDownloadAll'
import { wixFetch } from 'lib/wix/fetch'
import { publicationsQuery } from 'lib/wix/queries'
import type { PublicationEntry as P } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Publications' }

export default async function Publications() {
  const pubs = (await wixFetch<P[]>(publicationsQuery)) ?? []
  return (
    <PageStrip
      heading="PUBLICATIONS"
      headingClass="text-[28px]/[37.8px] md:text-[40px]/[54px]"
      topClass="pt-[38px] md:pt-[74px]"
      headingRight={<PublicationsDownloadAll pubs={pubs} />}
    >
      <ul>
        {pubs.map((p) => (
          <PublicationEntry key={p._id} pub={p} />
        ))}
      </ul>
    </PageStrip>
  )
}
