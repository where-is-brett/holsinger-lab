import type { CitationInput } from 'lib/wix/citationExport'
import { describe, expect, it } from 'vitest'

import { fileBase } from './CitationActions'

const WITH_SLUG: CitationInput = { _id: 'abc123', title: 'A paper', slug: 'a-paper-2024' }
const WITHOUT_SLUG: CitationInput = { _id: 'abc123', title: 'A paper', slug: null }
const UNDEFINED_SLUG: CitationInput = { _id: 'abc123', title: 'A paper' }
const EMPTY_SLUG: CitationInput = { _id: 'abc123', title: 'A paper', slug: '' }

describe('fileBase', () => {
  it('uses the slug when present', () => {
    expect(fileBase(WITH_SLUG)).toBe('a-paper-2024')
  })

  it('falls back to _id when slug is null', () => {
    expect(fileBase(WITHOUT_SLUG)).toBe('abc123')
  })

  it('falls back to _id when slug is undefined (matched Wix publications, per lib/wix/queries.ts)', () => {
    expect(fileBase(UNDEFINED_SLUG)).toBe('abc123')
  })

  it('falls back to _id when slug is an empty string', () => {
    expect(fileBase(EMPTY_SLUG)).toBe('abc123')
  })
})
