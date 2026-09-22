import { wixFetch } from 'lib/wix/fetch'
import { siteNameQuery } from 'lib/wix/queries'
import Link from 'next/link'

import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'

export async function SiteHeader() {
  const siteName = (await wixFetch<string>(siteNameQuery)) ?? ''
  return (
    <header>
      <div className="hidden md:block">
        <div className="wix-col pt-[40px] pb-[15px]">
          <p data-wix="site-title" className="text-center font-playfair text-[32px]/[43.2px]">
            <Link href="/">{siteName}</Link>
          </p>
          <hr data-wix="rule" className="mx-auto mt-[27px] max-w-[940px] border-0 border-t border-rule" />
          <NavLinks />
        </div>
      </div>
      <div className="flex items-start justify-between px-[20px] pt-[40px] pb-[24px] md:hidden">
        <p data-wix="site-title-mobile" className="max-w-[260px] font-playfair text-[19px]/[25.65px]">
          <Link href="/">{siteName}</Link>
        </p>
        <MobileMenu />
      </div>
    </header>
  )
}
