import { describe, expect, it } from 'vitest'

import { enquiryEmail, researchKicker } from './researchModel'

describe('researchKicker', () => {
  it('joins "Since {year}" and category with " · " when both are set', () => {
    expect(
      researchKicker({ start: '2023-06-01T00:00:00.000Z', category: 'Non-pharmacological interventions' })
    ).toBe('Since 2023 · Non-pharmacological interventions')
  })

  it('is just "Since {year}" when there is no category', () => {
    expect(researchKicker({ start: '2018-01-01T00:00:00.000Z', category: null })).toBe('Since 2018')
  })

  it('is just the category when there is no start date', () => {
    expect(researchKicker({ start: null, category: 'Non-pharmacological interventions' })).toBe(
      'Non-pharmacological interventions'
    )
  })

  it('is empty when neither is set', () => {
    expect(researchKicker({ start: null, category: null })).toBe('')
  })

  it.each([[undefined], [null], [''], ['   ']])(
    'treats %j as no start date',
    (start) => {
      expect(researchKicker({ start, category: 'Category' })).toBe('Category')
    }
  )

  it.each([[undefined], [null], [''], ['   ']])(
    'treats %j as no category',
    (category) => {
      expect(researchKicker({ start: '2020-01-01T00:00:00.000Z', category })).toBe('Since 2020')
    }
  )

  it('takes only the leading 4-digit year from a full ISO datetime', () => {
    expect(researchKicker({ start: '2019-11-05T08:30:00.000Z', category: null })).toBe('Since 2019')
  })

  it('trims surrounding whitespace off a category before joining', () => {
    expect(researchKicker({ start: '2023-01-01T00:00:00.000Z', category: '  Glia  ' })).toBe(
      'Since 2023 · Glia'
    )
  })
})

describe('enquiryEmail', () => {
  it('prefers a trimmed settings.contact.email', () => {
    expect(
      enquiryEmail({
        contact: { email: '  contact@example.org  ' },
        labHead: { email: 'labhead@example.org' },
      })
    ).toBe('contact@example.org')
  })

  it('falls back to a trimmed settings.labHead.email when contact.email is unset', () => {
    expect(enquiryEmail({ contact: null, labHead: { email: '  labhead@example.org  ' } })).toBe(
      'labhead@example.org'
    )
  })

  it('falls back to labHead.email when contact.email is whitespace-only', () => {
    expect(enquiryEmail({ contact: { email: '   ' }, labHead: { email: 'labhead@example.org' } })).toBe(
      'labhead@example.org'
    )
  })

  it('returns null when neither is set', () => {
    expect(enquiryEmail({ contact: null, labHead: null })).toBeNull()
  })

  it('returns null when both are whitespace-only', () => {
    expect(enquiryEmail({ contact: { email: '  ' }, labHead: { email: '  ' } })).toBeNull()
  })

  it.each([
    [{}],
    [{ contact: undefined, labHead: undefined }],
    [{ contact: { email: undefined }, labHead: { email: undefined } }],
    [{ contact: { email: null }, labHead: { email: null } }],
  ])('returns null for %j', (settings) => {
    expect(enquiryEmail(settings)).toBeNull()
  })
})
