import { mailtoHref, telHref } from 'lib/wix/format'
import type { ContactDetails } from 'lib/wix/types'

export function ContactBlock({ contact }: { contact: ContactDetails | null }) {
  const mail = mailtoHref(contact?.email)
  const tel = telHref(contact?.phone)
  return (
    <section data-wix-block="contact" className="wix-col pt-[60px] pb-[40px] text-center md:pt-[65px]">
      <h2 className="font-playfair text-[28px]/[37.8px] md:text-[40px]/[54px]">CONTACT US</h2>
      <div className="mt-[20px] space-y-[20px] font-raleway text-[15px]/[28.1px]">
        {contact?.address ? <p>{contact.address}</p> : null}
        {mail ? (
          <p>
            <a href={mail}>{contact?.email}</a>
          </p>
        ) : null}
        {tel ? (
          <p>
            <a href={tel}>{contact?.phone}</a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
