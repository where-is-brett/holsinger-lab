import type { HomeData } from 'lib/wix/types'

import { InlineText } from './InlineText'

export function NewsHighlights({ news }: { news: HomeData['news'] }) {
  if (!news.length) return null
  return (
    <section data-wix-block="news" className="wix-col pt-[60px] md:pt-[100px]">
      <h2 className="font-playfair text-[31px]/[41.85px] md:text-[30px]/[40.5px]">News &amp; Highlights</h2>
      <ul className="mt-[20px] space-y-[40px] md:space-y-[45px]">
        {news.map((n) => (
          <li key={n._id} data-wix="news-item">
            <h3 className="font-playfair text-[18px]/[26.25px] font-bold md:text-[22px]/[31.5px]">{n.title}</h3>
            <InlineText value={n.body} className="mt-[16px] font-lato text-[17px]/[24px] font-light md:text-[20px]/[28.2px]" />
          </li>
        ))}
      </ul>
    </section>
  )
}
