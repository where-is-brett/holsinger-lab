import { describe, expect, it } from 'vitest'

import { contactDetails, telHref, UNIVERSITY_URL } from './contactModel'

describe('contactDetails', () => {
  it('trims each field and keeps inner line breaks in the address', () => {
    expect(
      contactDetails({
        email: '  lab@example.org ',
        phone: ' +61 2 9351 0876 ',
        address: '\nLaboratory of Molecular Neuroscience\nThe University of Sydney NSW 2006  ',
      })
    ).toEqual({
      email: 'lab@example.org',
      phone: '+61 2 9351 0876',
      address: 'Laboratory of Molecular Neuroscience\nThe University of Sydney NSW 2006',
    })
  })

  it('treats blank or missing fields as unset', () => {
    expect(contactDetails({ email: '   ', phone: null })).toEqual({ email: null, phone: null, address: null })
  })

  it.each([[null], [undefined]])('is all-null for %j', (contact) => {
    expect(contactDetails(contact)).toEqual({ email: null, phone: null, address: null })
  })
})

describe('telHref', () => {
  it('keeps only digits and a leading plus', () => {
    expect(telHref('+61 2 9351 0876')).toBe('tel:+61293510876')
    expect(telHref('(02) 9351-0876')).toBe('tel:0293510876')
  })
})

describe('UNIVERSITY_URL', () => {
  it('is the constant the spec names', () => {
    expect(UNIVERSITY_URL).toBe('https://www.sydney.edu.au/')
  })
})
