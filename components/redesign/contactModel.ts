// `settings.contact` has no URL field, so the University link is a constant.
export const UNIVERSITY_URL = 'https://www.sydney.edu.au/'
export const UNIVERSITY_NAME = 'The University of Sydney'

export interface ContactDetails {
  email: string | null
  phone: string | null
  /** Trimmed at the ends only; inner line breaks are the editor's and render as lines. */
  address: string | null
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** `settings.contact`, with blank or missing fields as `null` so each row renders only when set. */
export function contactDetails(
  contact?: { email?: string | null; phone?: string | null; address?: string | null } | null
): ContactDetails {
  return {
    email: clean(contact?.email),
    phone: clean(contact?.phone),
    address: clean(contact?.address),
  }
}

/** A dialable `tel:` href: the number's digits and a leading plus, with spaces and punctuation dropped. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
