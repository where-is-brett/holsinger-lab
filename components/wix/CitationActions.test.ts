import type { CitationInput } from 'lib/wix/citationExport'
import { describe, expect, it } from 'vitest'

import { copyFallbackMessage, fileBase } from './CitationActions'

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

describe('copyFallbackMessage', () => {
  it('tells a coarse-pointer (touch) device the citation is already selected, never a keystroke', () => {
    // Neither ⌘C nor Ctrl+C makes sense with no keyboard -- and a coarse
    // pointer means no keyboard, regardless of the device's OS (an Android
    // tablet is mac:false here; an iPad reporting as "Mac" -- iPadOS's
    // desktop-class UA -- is mac:true). Coarse-pointer wins either way.
    expect(copyFallbackMessage({ coarsePointer: true, mac: false })).toBe("Citation selected -- use your device’s copy action")
    expect(copyFallbackMessage({ coarsePointer: true, mac: true })).toBe("Citation selected -- use your device’s copy action")
  })

  it('shows the Mac keystroke on a fine (mouse/trackpad) pointer on a Mac', () => {
    expect(copyFallbackMessage({ coarsePointer: false, mac: true })).toBe('Press ⌘C')
  })

  it('shows the Windows/Linux keystroke on a fine (mouse/trackpad) pointer elsewhere', () => {
    expect(copyFallbackMessage({ coarsePointer: false, mac: false })).toBe('Press Ctrl+C')
  })
})
