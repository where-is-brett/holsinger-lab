import { describe, expect, it } from 'vitest'

import {
  effectiveScheme,
  otherScheme,
  parseStoredScheme,
  SCHEME_INIT_SCRIPT,
  SCHEME_STORAGE_KEY,
  switchLabel,
} from './colorScheme'

describe('parseStoredScheme', () => {
  it('accepts the two schemes', () => {
    expect(parseStoredScheme('light')).toBe('light')
    expect(parseStoredScheme('dark')).toBe('dark')
  })

  it('treats anything else as no choice, so the device setting applies', () => {
    for (const bad of [null, undefined, '', 'auto', 'Dark', 42, {}]) {
      expect(parseStoredScheme(bad)).toBeNull()
    }
  })
})

describe('effectiveScheme', () => {
  it('follows the device when the visitor has not chosen', () => {
    expect(effectiveScheme(null, true)).toBe('dark')
    expect(effectiveScheme(null, false)).toBe('light')
  })

  it("puts the visitor's choice ahead of the device", () => {
    expect(effectiveScheme('light', true)).toBe('light')
    expect(effectiveScheme('dark', false)).toBe('dark')
  })
})

describe('otherScheme', () => {
  it('flips between the two', () => {
    expect(otherScheme('light')).toBe('dark')
    expect(otherScheme('dark')).toBe('light')
  })
})

describe('switchLabel', () => {
  it('names the scheme the button switches TO, in sentence case', () => {
    expect(switchLabel('light')).toBe('Switch to dark theme')
    expect(switchLabel('dark')).toBe('Switch to light theme')
  })
})

describe('SCHEME_INIT_SCRIPT', () => {
  // Runs the inline <head> script against a stand-in document and storage,
  // the way the browser runs it before first paint.
  function run(storage: { getItem(key: string): string | null }) {
    const attrs: Record<string, string> = {}
    const documentElement = {
      setAttribute: (name: string, value: string) => {
        attrs[name] = value
      },
    }
    new Function('document', 'sessionStorage', SCHEME_INIT_SCRIPT)(
      { documentElement },
      storage
    )
    return attrs
  }

  it("restores this visit's choice before anything paints", () => {
    expect(
      run({ getItem: (k) => (k === SCHEME_STORAGE_KEY ? 'dark' : null) })
    ).toEqual({
      'data-scheme': 'dark',
    })
    expect(
      run({ getItem: (k) => (k === SCHEME_STORAGE_KEY ? 'light' : null) })
    ).toEqual({
      'data-scheme': 'light',
    })
  })

  it('sets nothing when there is no valid choice, leaving the device in charge', () => {
    expect(run({ getItem: () => null })).toEqual({})
    expect(run({ getItem: () => 'purple' })).toEqual({})
  })

  it('never throws when storage is blocked', () => {
    expect(
      run({
        getItem: () => {
          throw new Error('SecurityError')
        },
      })
    ).toEqual({})
  })

  it('cannot break out of its <script> element', () => {
    expect(SCHEME_INIT_SCRIPT).not.toMatch(/[<>]/)
  })
})
