import { doiHref, formatCitationLine } from 'lib/wix/format'
import type { PublicationEntry as P } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'

export function PublicationEntry({ pub }: { pub: P }) {
  const citation = formatCitationLine(pub)
  const doi = doiHref(pub.doi)
  const url = !doi && pub.url ? stegaClean(pub.url) : null
  const doiText = doi ? stegaClean(pub.doi)?.replace(/^https?:\/\/doi\.org\//, '') : null

  return (
    <li data-wix="publication" className="mt-[46px] first:mt-[60px] md:mt-[34px] md:first:mt-[76px]">
      <h2 data-wix="pub-title" className="font-playfair text-[17px]/[26px] md:text-[20px]/[31px]">
        {pub.title.trim()}
      </h2>
      {pub.author ? (
        <p className="mt-[5px] font-playfair text-[14px]/[22px] md:mt-[3px] md:text-[16px]/[31px]">
          {pub.author}
        </p>
      ) : null}
      {citation ? (
        <p data-wix="pub-citation" className="font-didot text-[14px]/[22px] italic md:text-[16px]/[28px]">
          {citation}
        </p>
      ) : null}
      {doi ? (
        <p className="font-didot text-[14px]/[22px] italic md:text-[16px]/[28px]">
          doi:{' '}
          <a href={doi} className="text-black no-underline">
            {doiText}
          </a>
        </p>
      ) : url ? (
        <p className="font-didot text-[14px]/[22px] italic md:text-[16px]/[28px]">
          <a href={url} className="text-black no-underline">
            link
          </a>
        </p>
      ) : null}
    </li>
  )
}
