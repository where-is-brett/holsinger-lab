import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// `components/pages/home/ProjectListItem.tsx` was removed by PR C Task 3
// (Home rebuilt on the redesign primitives, which render images through
// next/image directly, not ImageBox/hotspot cropping) -- see
// components/redesign/screens/Home.tsx.
const CALL_SITES = ['components/shared/CustomPortableText.tsx']

describe('image hotspot contract', () => {
  it.each(CALL_SITES)(
    '%s never feeds a hotspot fraction into a pixel-size prop',
    (relativePath) => {
      const source = readFileSync(relativePath, 'utf8')
      expect(source).not.toMatch(/\bhotspot\?\.(width|height)\b/)
    }
  )
})
