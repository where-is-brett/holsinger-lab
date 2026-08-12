import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync('components/shared/TimelineItem.tsx', 'utf8')

describe('TimelineItem thumbnail', () => {
  it('requests a source large enough for high-DPR screens', () => {
    // The thumbnail renders in a 65px CSS box. Passing width={65} caps the
    // Sanity render at 65px, and next/image cannot upscale past its
    // source, so a DPR-2 screen received a half-resolution bitmap.
    const width = Number(source.match(/width=\{(\d+)\}/)?.[1])
    expect(width).toBeGreaterThanOrEqual(130)
  })

  it('declares the real layout width rather than a viewport fraction', () => {
    // The box is a fixed 65px, so `10vw` over-declares on wide viewports
    // and under-declares on narrow ones.
    expect(source).toMatch(/size="65px"/)
  })

  it('gives the ImageBox wrapper a definite height', () => {
    // ImageBox positions its own wrapper, and its <img> is absolutely
    // positioned, so it contributes no height. Without an explicit height
    // the wrapper collapses to 0 inside this fixed-size 65px parent and the
    // thumbnail becomes invisible.
    expect(source).toMatch(/classesWrapper="[^"]*h-full/)
  })
})
