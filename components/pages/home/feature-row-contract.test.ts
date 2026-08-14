import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('FeatureRow image wrapper', () => {
  const source = readFileSync('components/pages/home/FeatureRow.tsx', 'utf8')

  it('does not repeat h-full', () => {
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    const occurrences = wrapper.split(/\s+/).filter((c) => c === 'h-full')
    expect(occurrences).toHaveLength(1)
  })

  it('keeps aspect-[16/9], which is load-bearing below the md breakpoint', () => {
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    expect(wrapper).toContain('aspect-[16/9]')
  })
})
