import { ContactBlock } from 'components/wix/ContactBlock'
import { PageStrip } from 'components/wix/PageStrip'
import { wixFetch } from 'lib/wix/fetch'
import { contactQuery } from 'lib/wix/queries'
import type { ContactData } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Contact' }

export default async function Contact() {
  const c = (await wixFetch<ContactData>(contactQuery)) ?? { intro: null, contact: null }
  return (
    <PageStrip heading="Contact" headingClass="sr-only" topClass="pt-[62px] md:pt-[65px]">
      {c.intro ? (
        <p data-wix="contact-intro" className="text-center font-raleway text-[20px]/[36px] md:text-[25px]/[47px]">
          {c.intro}
        </p>
      ) : null}
      {/*
        ContactBlock's own top padding (tuned for its use on Home, directly
        under different preceding content) puts CONTACT US 35px lower than
        Wix's target here. Pull it up rather than changing the shared
        component, which Home also relies on.
      */}
      <div className="-mt-[35px]">
        <ContactBlock contact={c.contact} />
      </div>
    </PageStrip>
  )
}
