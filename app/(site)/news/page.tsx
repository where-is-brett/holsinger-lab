import { PageStrip } from 'components/wix/PageStrip'
import { wixFetch } from 'lib/wix/fetch'
import { newsQuery } from 'lib/wix/queries'
import type { NewsLine } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'News' }

export default async function News() {
  const items = (await wixFetch<NewsLine[]>(newsQuery)) ?? []
  return (
    <PageStrip heading="Latest news" topClass="pt-[62px] md:pt-[122px]">
      <ul className="mt-[40px] space-y-[40px] md:mt-[86px] md:space-y-[71px]">
        {items.map((n) => (
          <li
            key={n._id}
            data-wix="news-line"
            className="font-lato text-[17px]/[24px] font-light md:text-[22px]/[31px]"
          >
            {n.summary || n.title}
          </li>
        ))}
      </ul>
    </PageStrip>
  )
}
