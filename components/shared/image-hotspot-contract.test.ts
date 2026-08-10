import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const CALL_SITES = [
  'components/pages/home/ProjectListItem.tsx',
  'components/shared/CustomPortableText.tsx',
]

describe('image hotspot contract', () => {
  it.each(CALL_SITES)(
    '%s never feeds a hotspot fraction into a pixel-size prop',
    (relativePath) => {
      const source = readFileSync(relativePath, 'utf8')
      expect(source).not.toMatch(/\bhotspot\?\.(width|height)\b/)
    }
  )
})
