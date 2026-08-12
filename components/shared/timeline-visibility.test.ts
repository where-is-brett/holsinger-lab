import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('timeline visibility toggle', () => {
  it('declares a hidden field on the timeline schema', () => {
    const schema = readFileSync('schemas/objects/timeline.ts', 'utf8')
    expect(schema).toMatch(/name: 'hidden'/)
    expect(schema).toMatch(/type: 'boolean'/)
  })

  it('treats only an explicit true as hidden', () => {
    const source = readFileSync('components/shared/CustomPortableText.tsx', 'utf8')
    // Every already-published document has this field unset. A truthiness
    // check on the wrong side of the comparison would hide all existing
    // timelines, so the guard must test for `=== true` / `if (hidden)`
    // and return null, never `if (!hidden)`.
    expect(source).toMatch(/hidden/)
    expect(source).not.toMatch(/if \(!hidden\)/)
  })

  it('never interpolates an undefined paragraphClasses into className', () => {
    const source = readFileSync('components/shared/CustomPortableText.tsx', 'utf8')
    // `paragraphClasses` is an optional prop, and most callers omit it.
    // Every `${paragraphClasses}` then renders the literal string
    // "undefined" as a CSS class -- confirmed live on `/`, where 11
    // elements carried `class="undefined my-[1em]"`.
    expect(source).not.toMatch(/\$\{paragraphClasses\}/)
  })
})
