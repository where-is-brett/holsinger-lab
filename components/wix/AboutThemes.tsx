import type { HomeData } from 'lib/wix/types'

import { InlineText } from './InlineText'

export function AboutThemes({ about }: { about: NonNullable<HomeData['copy']>['about'] }) {
  if (!about) return null
  return (
    <section data-wix-block="about" className="wix-col pt-[40px] md:pt-[99px]">
      {about.heading ? <h2 className="font-playfair text-[21px]/[33.6px] md:text-[30px]/[48px]">{about.heading}</h2> : null}
      <InlineText data-wix="about-body" value={about.body} className="font-lato text-[15px]/[24px] font-light md:text-[20px]/[32px]" />
      {about.themesIntro ? (
        <p className="mt-[16px] font-lato text-[15px]/[24px] font-light md:mt-[3px] md:text-[20px]/[32px]">{about.themesIntro}</p>
      ) : null}
      {about.themes?.length ? (
        <ul className="mt-[30px] space-y-[36px] md:mt-[31px]">
          {about.themes.map((t) => (
            <li key={t._key}>
              {t.title ? <h3 className="font-playfair text-[15px]/[24px] font-bold md:text-[20px]/[32px]">{t.title}</h3> : null}
              {t.summary ? <p className="font-lato text-[15px]/[24px] font-light md:text-[20px]/[32px]">{t.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
