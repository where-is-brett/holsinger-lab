import { SiteFooter } from 'components/wix/SiteFooter'
import { SiteHeader } from 'components/wix/SiteHeader'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}
